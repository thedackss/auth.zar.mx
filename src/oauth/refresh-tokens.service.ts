import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { env } from "@/env";
import type { AppRefreshToken } from "@/prisma/generated/client";
import { PrismaService } from "@/prisma/prisma.service";

const PREFIX = "zrt_";

export interface IssuedRefreshToken {
    /** Plaintext, returned to the client exactly once. */
    token: string;
    row: AppRefreshToken;
}

/**
 * Opaque refresh tokens for the PKCE flow. Stored as sha256 hashes (the
 * values are high-entropy, so a fast hash is fine). One family per device
 * sign-in; rotation keeps the superseded row (revokedAt set) so a replay is
 * detectable and revokes the family.
 */
@Injectable()
export class RefreshTokensService {
    constructor(private readonly prisma: PrismaService) {}

    public hash(token: string): string {
        return createHash("sha256").update(token).digest("hex");
    }

    private generate(): string {
        return `${PREFIX}${randomBytes(32).toString("base64url")}`;
    }

    private expiry(): Date {
        return new Date(Date.now() + env.OAUTH_REFRESH_TTL_SECONDS * 1000);
    }

    public async issue(props: {
        appId: string;
        userId: string;
        deviceName?: string;
        familyId?: string;
    }): Promise<IssuedRefreshToken> {
        const token = this.generate();

        const row = await this.prisma.client.appRefreshToken.create({
            data: {
                appId: props.appId,
                userId: props.userId,
                familyId: props.familyId ?? randomUUID(),
                tokenHash: this.hash(token),
                deviceName: props.deviceName,
                expiresAt: this.expiry(),
            },
        });

        return { token, row };
    }

    public findByToken(token: string) {
        if (!token.startsWith(PREFIX)) return null;

        return this.prisma.client.appRefreshToken.findUnique({
            where: { tokenHash: this.hash(token) },
            include: { app: true, user: true },
        });
    }

    /** Supersedes `current` with a fresh token in the same family. */
    public async rotate(current: AppRefreshToken): Promise<IssuedRefreshToken> {
        const token = this.generate();
        const now = new Date();

        const [, row] = await this.prisma.client.$transaction([
            this.prisma.client.appRefreshToken.update({
                where: { id: current.id },
                data: { supersededAt: now, lastUsedAt: now },
            }),
            this.prisma.client.appRefreshToken.create({
                data: {
                    appId: current.appId,
                    userId: current.userId,
                    familyId: current.familyId,
                    tokenHash: this.hash(token),
                    deviceName: current.deviceName,
                    expiresAt: this.expiry(),
                },
            }),
        ]);

        return { token, row };
    }

    public async revokeFamily(familyId: string): Promise<number> {
        const { count } = await this.prisma.client.appRefreshToken.updateMany({
            where: { familyId, revokedAt: null, supersededAt: null },
            data: { revokedAt: new Date() },
        });
        return count;
    }

    /** Revokes every live token matching the filter (user disabled, app revoked, grant removed). */
    public async revokeAll(filter: {
        userId?: string;
        appId?: string;
    }): Promise<number> {
        if (!filter.userId && !filter.appId) return 0;

        const { count } = await this.prisma.client.appRefreshToken.updateMany({
            where: { ...filter, revokedAt: null, supersededAt: null },
            data: { revokedAt: new Date() },
        });
        return count;
    }

    /** Live sign-ins for a user: the current token of each family. */
    public async listForUser(userId: string) {
        const rows = await this.prisma.client.appRefreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                supersededAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { app: { select: { id: true, name: true, url: true } } },
            orderBy: { createdAt: "desc" },
        });

        return rows.map((row) => ({
            familyId: row.familyId,
            app: row.app,
            deviceName: row.deviceName,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt,
            expiresAt: row.expiresAt,
        }));
    }

    public async familyBelongsTo(familyId: string, userId: string) {
        const row = await this.prisma.client.appRefreshToken.findFirst({
            where: { familyId, userId },
            select: { appId: true },
        });
        return row;
    }
}
