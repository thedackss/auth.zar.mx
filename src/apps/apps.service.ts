import { createHash, randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { App } from "@/prisma/generated/client";
import type { PrismaTx } from "@/prisma/interfaces/transaction.interface";
import { PrismaService } from "@/prisma/prisma.service";

// keyHash is a sha256 of the full key: keys are high-entropy random strings,
// so a fast hash is fine (unlike passwords) and allows unique-index lookup.
const KEY_PREFIX = "zak_";

export interface CreateAppProps {
    name: string;
    url?: string;
    public: boolean;
}

export interface UpdateAppProps {
    name?: string;
    url?: string | null;
    public?: boolean;
}

@Injectable()
export class AppsService {
    constructor(private readonly prisma: PrismaService) {}

    // Never expose keyHash outside this service.
    private readonly publicFields = {
        id: true,
        name: true,
        url: true,
        public: true,
        createdAt: true,
        updatedAt: true,
        revokedAt: true,
    } as const;

    private hashKey(key: string): string {
        return createHash("sha256").update(key).digest("hex");
    }

    private generateKey(): string {
        return `${KEY_PREFIX}${randomBytes(32).toString("hex")}`;
    }

    public findAll() {
        return this.prisma.client.app.findMany({
            select: {
                ...this.publicFields,
                _count: { select: { accesses: true } },
            },
            orderBy: { createdAt: "asc" },
        });
    }

    public async check(id: string): Promise<App> {
        const app = await this.prisma.client.app.findUnique({ where: { id } });
        if (!app) throw new NotFoundException("App not found");
        return app;
    }

    public async create(props: CreateAppProps) {
        const key = this.generateKey();

        const app = await this.prisma.client.app
            .create({
                data: {
                    name: props.name.trim(),
                    url: props.url,
                    public: props.public,
                    keyHash: this.hashKey(key),
                },
                select: this.publicFields,
            })
            .catch(
                this.prisma.catchKnownErrors({
                    P2002: "An app with the same name already exists",
                }),
            );

        return { app, key };
    }

    public async update(id: string, data: UpdateAppProps) {
        await this.check(id);

        return this.prisma.client.app
            .update({ where: { id }, data, select: this.publicFields })
            .catch(
                this.prisma.catchKnownErrors({
                    P2002: "An app with the same name already exists",
                }),
            );
    }

    public async regenerateKey(id: string) {
        await this.check(id);
        const key = this.generateKey();

        const app = await this.prisma.client.app.update({
            where: { id },
            data: { keyHash: this.hashKey(key), revokedAt: null },
            select: this.publicFields,
        });

        return { app, key };
    }

    public async revoke(id: string) {
        await this.check(id);

        return this.prisma.client.app.update({
            where: { id },
            data: { revokedAt: new Date() },
            select: this.publicFields,
        });
    }

    public async remove(id: string) {
        await this.check(id);
        await this.prisma.client.app.delete({ where: { id } });
    }

    /** Resolves an app from its API key; null for unknown or revoked keys. */
    public async findByKey(key: string): Promise<App | null> {
        if (!key.startsWith(KEY_PREFIX)) return null;

        const app = await this.prisma.client.app.findUnique({
            where: { keyHash: this.hashKey(key) },
        });

        if (!app || app.revokedAt) return null;
        return app;
    }

    // ---- access grants -------------------------------------------------

    public async listAccess(appId: string) {
        await this.check(appId);

        return this.prisma.client.appAccess.findMany({
            where: { appId },
            include: { user: { select: { id: true, email: true } } },
            orderBy: { createdAt: "asc" },
        });
    }

    /**
     * Grants a private app to an email. If a user with that email exists the
     * grant binds to the user; otherwise it's a pre-authorization that lets
     * the email sign up through the app (converted on registration).
     */
    public async grant(appId: string, email: string, grantedBy: string) {
        await this.check(appId);
        const normalized = email.trim().toLowerCase();

        const user = await this.prisma.client.user.findUnique({
            where: { email: normalized },
        });

        return this.prisma.client.appAccess
            .create({
                data: user
                    ? { appId, userId: user.id, grantedBy }
                    : { appId, email: normalized, grantedBy },
                include: { user: { select: { id: true, email: true } } },
            })
            .catch(
                this.prisma.catchKnownErrors({
                    P2002: "That email already has access to this app",
                }),
            );
    }

    public async revokeAccess(appId: string, accessId: string) {
        const access = await this.prisma.client.appAccess.findUnique({
            where: { id: accessId },
        });
        if (!access || access.appId !== appId)
            throw new NotFoundException("Access grant not found");

        await this.prisma.client.appAccess.delete({ where: { id: accessId } });
        return access;
    }

    /** May this existing user obtain a token for this app? */
    public async hasAccess(app: App, userId: string): Promise<boolean> {
        if (app.public) return true;

        const access = await this.prisma.client.appAccess.findUnique({
            where: { appId_userId: { appId: app.id, userId } },
        });

        return access !== null;
    }

    /** May this email register through this app? */
    public async hasEmailGrant(appId: string, email: string): Promise<boolean> {
        const access = await this.prisma.client.appAccess.findUnique({
            where: {
                appId_email: { appId, email: email.trim().toLowerCase() },
            },
        });

        return access !== null;
    }

    /** Converts an email pre-authorization into a user grant on sign-up. */
    public async consumeEmailGrant(
        appId: string,
        email: string,
        userId: string,
        tx?: PrismaTx,
    ) {
        const client = tx ?? this.prisma.client;

        await client.appAccess.update({
            where: {
                appId_email: { appId, email: email.trim().toLowerCase() },
            },
            data: { userId, email: null },
        });
    }
}
