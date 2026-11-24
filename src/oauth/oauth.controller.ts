import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuditService } from "@/audit/audit.service";
import { requestMeta } from "@/audit/request-meta";
import { Authenticated } from "@/auth/decorators/authenticated.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/prisma/generated/client";
import { AuthorizeCheckDto, AuthorizeDto } from "./dto/authorize.dto";
import { SessionParamsDto } from "./dto/session-params.dto";
import { RevokeDto, TokenDto } from "./dto/token.dto";
import { OauthDeniedError, OauthService } from "./oauth.service";
import { RefreshTokensService } from "./refresh-tokens.service";

/**
 * Authorization code + PKCE endpoints for public clients. The panel's
 * /authorize page drives authorize-check and authorize with the user's
 * session; the app itself calls oauth/token and oauth/revoke with no
 * credentials beyond the code/verifier or refresh token.
 */
@ApiTags("oauth")
@Controller("app")
export class OauthController {
    constructor(
        private readonly oauth: OauthService,
        private readonly refreshTokens: RefreshTokensService,
        private readonly audit: AuditService,
    ) {}

    /** Is this client_id + redirect_uri pair valid? Public info for the consent screen. */
    @Get("authorize-check")
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    public async authorizeCheck(@Query() query: AuthorizeCheckDto) {
        const app = await this.oauth.checkClient(query);
        return {
            data: {
                id: app.id,
                name: app.name,
                url: app.url,
                public: app.public,
            },
            message: "Authorization request is valid",
        };
    }

    @Post("authorize")
    @ApiCookieAuth()
    @Authenticated()
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async authorize(
        @CurrentUser() user: User,
        @Body() body: AuthorizeDto,
        @Req() req: Request,
    ) {
        try {
            const { app, redirectTo } = await this.oauth.authorize(user, body);

            await this.audit.record({
                type: "APP_AUTHORIZE",
                userId: user.id,
                email: user.email,
                metadata: { appId: app.id, appName: app.name },
                ...requestMeta(req),
            });

            return { data: { redirectTo }, message: "Authorized" };
        } catch (error) {
            if (error instanceof OauthDeniedError) {
                await this.audit.record({
                    type: "APP_AUTHORIZE_DENIED",
                    userId: user.id,
                    email: user.email,
                    metadata: { appId: body.client_id, reason: error.reason },
                    ...requestMeta(req),
                });
                // The redirect URI was validated, so the app may be told.
                const redirectTo = await this.oauth.deniedRedirect(
                    body,
                    body.state,
                );
                return {
                    data: { redirectTo, denied: true },
                    message: error.message,
                };
            }
            throw error;
        }
    }

    /** The user declined on the consent screen. */
    @Post("authorize/deny")
    @ApiCookieAuth()
    @Authenticated()
    @HttpCode(HttpStatus.OK)
    public async deny(@CurrentUser() user: User, @Body() body: AuthorizeDto) {
        const redirectTo = await this.oauth.deniedRedirect(body, body.state);
        return {
            data: { redirectTo, denied: true, user: user.email },
            message: "Declined",
        };
    }

    @Post("oauth/token")
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async token(@Body() body: TokenDto, @Req() req: Request) {
        if (body.grant_type === "authorization_code") {
            const result = await this.oauth.redeemCode(body);
            await this.audit.record({
                type: "APP_CODE_REDEEMED",
                userId: result.user.id,
                email: result.user.email,
                metadata: {
                    appId: result.app.id,
                    appName: result.app.name,
                    familyId: result.familyId,
                    deviceName: body.device_name ?? null,
                },
                ...requestMeta(req),
            });
            return { data: result.response, message: "Tokens issued" };
        }

        try {
            const result = await this.oauth.refresh(body);
            await this.audit.record({
                type: "APP_TOKEN_REFRESHED",
                userId: result.user.id,
                email: result.user.email,
                metadata: {
                    appId: result.app.id,
                    appName: result.app.name,
                    familyId: result.familyId,
                },
                ...requestMeta(req),
            });
            return { data: result.response, message: "Tokens refreshed" };
        } catch (error) {
            if (error instanceof OauthDeniedError && error.reason === "reuse") {
                await this.audit.record({
                    type: "APP_REFRESH_REUSE_DETECTED",
                    metadata: { appId: body.client_id },
                    ...requestMeta(req),
                });
            }
            throw error;
        }
    }

    @Post("oauth/revoke")
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async revoke(@Body() body: RevokeDto, @Req() req: Request) {
        const row = await this.oauth.revoke(body.client_id, body.refresh_token);

        if (row) {
            await this.audit.record({
                type: "APP_TOKEN_REVOKED",
                userId: row.userId,
                email: row.user.email,
                metadata: {
                    appId: row.appId,
                    appName: row.app.name,
                    familyId: row.familyId,
                    by: "app",
                },
                ...requestMeta(req),
            });
        }

        return { data: null, message: "Token revoked" };
    }

    /** Devices / apps the current user is signed into through the PKCE flow. */
    @Get("oauth/sessions")
    @ApiCookieAuth()
    @Authenticated()
    public async sessions(@CurrentUser() user: User) {
        const data = await this.refreshTokens.listForUser(user.id);
        return { data, message: "App sessions retrieved successfully" };
    }

    @Delete("oauth/sessions/:familyId")
    @ApiCookieAuth()
    @Authenticated()
    @HttpCode(HttpStatus.OK)
    public async revokeSession(
        @CurrentUser() user: User,
        @Param() { familyId }: SessionParamsDto,
        @Req() req: Request,
    ) {
        const owned = await this.refreshTokens.familyBelongsTo(
            familyId,
            user.id,
        );
        if (!owned) throw new NotFoundException("App session not found");

        await this.refreshTokens.revokeFamily(familyId);
        await this.audit.record({
            type: "APP_TOKEN_REVOKED",
            userId: user.id,
            email: user.email,
            metadata: { appId: owned.appId, familyId, by: "user" },
            ...requestMeta(req),
        });

        return { data: null, message: "App session revoked" };
    }
}
