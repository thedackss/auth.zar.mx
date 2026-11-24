import { createHash, randomBytes } from "node:crypto";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { AppsService } from "@/apps/apps.service";
import { TokenService } from "@/auth/token.service";
import { env } from "@/env";
import type { App, User } from "@/prisma/generated/client";
import { PrismaService } from "@/prisma/prisma.service";
import { RedisService } from "@/redis/redis.service";
import type { AuthorizeCheckDto, AuthorizeDto } from "./dto/authorize.dto";
import type { TokenDto } from "./dto/token.dto";
import { RefreshTokensService } from "./refresh-tokens.service";

const CODE_TTL_SECONDS = 60;

interface CodeRecord {
    appId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
}

export interface TokenResponse {
    accessToken: string;
    tokenType: "Bearer";
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
}

export class OauthDeniedError extends ForbiddenException {
    constructor(
        message: string,
        public readonly reason: string,
    ) {
        super(message);
    }
}

/**
 * Authorization code + PKCE (RFC 7636) for public clients: native apps and
 * web apps on other domains, which can neither keep a secret nor send the
 * first-party session cookie. The access token is the same app-scoped JWT
 * as /app/token; the refresh token is opaque, rotated, and revocable.
 */
@Injectable()
export class OauthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly apps: AppsService,
        private readonly tokens: TokenService,
        private readonly refreshTokens: RefreshTokensService,
    ) {}

    private codeKey(code: string) {
        return `oauth-code:${code}`;
    }

    /** Validates client + redirect URI; throws without ever redirecting. */
    public async checkClient(dto: AuthorizeCheckDto): Promise<App> {
        const app = await this.prisma.client.app.findUnique({
            where: { id: dto.client_id },
        });
        if (!app || app.revokedAt)
            throw new BadRequestException("Unknown client");

        if (!app.redirectUris.includes(dto.redirect_uri))
            throw new BadRequestException(
                "Redirect URI is not registered for this app",
            );

        return app;
    }

    /** Same rule as /app/token: private apps need a verified email and a grant. */
    private async userMayUse(app: App, user: User): Promise<boolean> {
        if (user.disabledAt || user.deletedAt) return false;
        if (app.public) return true;
        if (!user.emailVerifiedAt) return false;
        return this.apps.hasAccess(app, user.id);
    }

    public async authorize(user: User, dto: AuthorizeDto) {
        const app = await this.checkClient(dto);

        if (!(await this.userMayUse(app, user))) {
            throw new OauthDeniedError(
                "This account does not have access to this app",
                "access_denied",
            );
        }

        const code = randomBytes(32).toString("base64url");
        const record: CodeRecord = {
            appId: app.id,
            userId: user.id,
            redirectUri: dto.redirect_uri,
            codeChallenge: dto.code_challenge,
        };
        await this.redis.client.setex(
            this.codeKey(code),
            CODE_TTL_SECONDS,
            JSON.stringify(record),
        );

        const target = new URL(dto.redirect_uri);
        target.searchParams.set("code", code);
        if (dto.state) target.searchParams.set("state", dto.state);

        return { app, code, redirectTo: target.toString() };
    }

    /** Where to send the user when they decline (redirect URI already validated). */
    public async deniedRedirect(dto: AuthorizeCheckDto, state?: string) {
        await this.checkClient(dto);
        const target = new URL(dto.redirect_uri);
        target.searchParams.set("error", "access_denied");
        if (state) target.searchParams.set("state", state);
        return target.toString();
    }

    public async redeemCode(dto: TokenDto) {
        const code = dto.code ?? "";
        // GETDEL: a failed redemption still burns the code.
        const raw = await this.redis.client.getdel(this.codeKey(code));
        const invalid = () =>
            new BadRequestException("Invalid or expired authorization code");
        if (!raw) throw invalid();

        const record = JSON.parse(raw) as CodeRecord;
        const challenge = createHash("sha256")
            .update(dto.code_verifier ?? "")
            .digest("base64url");

        if (
            record.appId !== dto.client_id ||
            record.redirectUri !== dto.redirect_uri ||
            record.codeChallenge !== challenge
        )
            throw invalid();

        const [app, user] = await Promise.all([
            this.prisma.client.app.findUnique({ where: { id: record.appId } }),
            this.prisma.client.user.findUnique({
                where: { id: record.userId },
            }),
        ]);
        if (!app || app.revokedAt || !user) throw invalid();
        if (!(await this.userMayUse(app, user)))
            throw new OauthDeniedError(
                "This account does not have access to this app",
                "access_denied",
            );

        const refresh = await this.refreshTokens.issue({
            appId: app.id,
            userId: user.id,
            deviceName: dto.device_name,
        });

        return {
            app,
            user,
            familyId: refresh.row.familyId,
            response: this.response(user, app, refresh.token),
        };
    }

    public async refresh(dto: TokenDto) {
        const row = await this.refreshTokens.findByToken(
            dto.refresh_token ?? "",
        );
        if (!row || row.appId !== dto.client_id)
            throw new UnauthorizedException("Invalid refresh token");

        if (row.supersededAt) {
            // A rotated-away token was presented again: someone else holds a
            // copy (or the client lost the rotation). Kill the whole family.
            await this.refreshTokens.revokeFamily(row.familyId);
            throw new OauthDeniedError("Invalid refresh token", "reuse");
        }

        // Revoked on purpose (user, app or admin): plain rejection, no alarm.
        if (row.revokedAt)
            throw new UnauthorizedException("Invalid refresh token");

        if (row.expiresAt < new Date())
            throw new UnauthorizedException("Refresh token has expired");

        if (row.app.revokedAt || !(await this.userMayUse(row.app, row.user))) {
            await this.refreshTokens.revokeFamily(row.familyId);
            throw new OauthDeniedError(
                "This account does not have access to this app",
                "access_denied",
            );
        }

        const rotated = await this.refreshTokens.rotate(row);

        return {
            app: row.app,
            user: row.user,
            familyId: row.familyId,
            response: this.response(row.user, row.app, rotated.token),
        };
    }

    /** Revokes the token's family. Silent on unknown tokens (RFC 7009). */
    public async revoke(clientId: string, refreshToken: string) {
        const row = await this.refreshTokens.findByToken(refreshToken);
        if (!row || row.appId !== clientId) return null;

        await this.refreshTokens.revokeFamily(row.familyId);
        return row;
    }

    private response(
        user: User,
        app: App,
        refreshToken: string,
    ): TokenResponse {
        const access = this.tokens.sign(
            user,
            app,
            env.OAUTH_ACCESS_TTL_SECONDS,
        );
        return {
            ...access,
            refreshToken,
            refreshExpiresIn: env.OAUTH_REFRESH_TTL_SECONDS,
        };
    }
}
