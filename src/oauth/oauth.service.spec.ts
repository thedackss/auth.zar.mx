import { createHash } from "node:crypto";
import {
    BadRequestException,
    ForbiddenException,
    UnauthorizedException,
} from "@nestjs/common";
import type { App, User } from "@/prisma/generated/client";
import { OauthDeniedError, OauthService } from "./oauth.service";

jest.mock("@/env", () => ({
    env: { OAUTH_ACCESS_TTL_SECONDS: 900, OAUTH_REFRESH_TTL_SECONDS: 1000 },
}));

const app = {
    id: "app-1",
    name: "24xp",
    public: false,
    revokedAt: null,
    redirectUris: ["xp24://auth/callback"],
} as unknown as App;

const user = {
    id: "u1",
    email: "user@domain.tld",
    role: "USER",
    emailVerifiedAt: new Date(),
    disabledAt: null,
    deletedAt: null,
} as unknown as User;

const verifier = "a".repeat(43);
const challenge = createHash("sha256").update(verifier).digest("base64url");

function build() {
    const store = new Map<string, string>();
    const redis = {
        client: {
            setex: jest.fn(async (k: string, _t: number, v: string) => {
                store.set(k, v);
            }),
            getdel: jest.fn(async (k: string) => {
                const v = store.get(k) ?? null;
                store.delete(k);
                return v;
            }),
        },
    };
    const prisma = {
        client: {
            app: { findUnique: jest.fn(async () => app) },
            user: { findUnique: jest.fn(async () => user) },
        },
    };
    const apps = { hasAccess: jest.fn(async () => true) };
    const tokens = {
        sign: jest.fn((_u: User, _a: App, ttl: number) => ({
            accessToken: "jwt",
            tokenType: "Bearer",
            expiresIn: ttl,
        })),
    };
    const refreshTokens = {
        issue: jest.fn(async () => ({
            token: "zrt_new",
            row: { familyId: "fam" },
        })),
        rotate: jest.fn(async () => ({
            token: "zrt_rotated",
            row: { familyId: "fam" },
        })),
        findByToken: jest.fn(),
        revokeFamily: jest.fn(async () => 1),
    };
    const service = new OauthService(
        prisma as never,
        redis as never,
        apps as never,
        tokens as never,
        refreshTokens as never,
    );
    return { service, redis, prisma, apps, tokens, refreshTokens, store };
}

describe("OauthService authorize + redeem", () => {
    const base = {
        client_id: "app-1",
        redirect_uri: "xp24://auth/callback",
        code_challenge: challenge,
        code_challenge_method: "S256" as const,
        state: "xyz",
    };

    it("rejects unknown clients and unregistered redirect URIs without redirecting", async () => {
        const { service } = build();
        await expect(
            service.checkClient({
                client_id: "app-1",
                redirect_uri: "https://evil.test/cb",
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("issues a one-time code bound to app, user, redirect and challenge, then redeems it", async () => {
        const { service, tokens, refreshTokens } = build();

        const { redirectTo, code } = await service.authorize(user, base);
        const url = new URL(redirectTo);
        expect(url.searchParams.get("code")).toBe(code);
        expect(url.searchParams.get("state")).toBe("xyz");

        const result = await service.redeemCode({
            grant_type: "authorization_code",
            client_id: "app-1",
            code,
            code_verifier: verifier,
            redirect_uri: "xp24://auth/callback",
            device_name: "Pixel",
        });

        expect(result.response).toMatchObject({
            accessToken: "jwt",
            expiresIn: 900,
            refreshToken: "zrt_new",
            refreshExpiresIn: 1000,
        });
        expect(tokens.sign).toHaveBeenCalledWith(user, app, 900);
        expect(refreshTokens.issue).toHaveBeenCalledWith(
            expect.objectContaining({
                appId: "app-1",
                userId: "u1",
                deviceName: "Pixel",
            }),
        );

        // Single use.
        await expect(
            service.redeemCode({
                grant_type: "authorization_code",
                client_id: "app-1",
                code,
                code_verifier: verifier,
                redirect_uri: "xp24://auth/callback",
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("a wrong verifier fails and still burns the code", async () => {
        const { service, store } = build();
        const { code } = await service.authorize(user, base);

        await expect(
            service.redeemCode({
                grant_type: "authorization_code",
                client_id: "app-1",
                code,
                code_verifier: "b".repeat(43),
                redirect_uri: "xp24://auth/callback",
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(store.size).toBe(0);
    });

    it("denies private apps to users without a grant or verified email", async () => {
        const { service, apps } = build();
        apps.hasAccess.mockResolvedValueOnce(false);
        await expect(service.authorize(user, base)).rejects.toBeInstanceOf(
            OauthDeniedError,
        );

        await expect(
            service.authorize({ ...user, emailVerifiedAt: null } as User, base),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("builds the access_denied redirect only for a validated redirect URI", async () => {
        const { service } = build();
        await expect(service.deniedRedirect(base, "xyz")).resolves.toBe(
            "xp24://auth/callback?error=access_denied&state=xyz",
        );
    });
});

describe("OauthService refresh", () => {
    const live = {
        id: "t1",
        appId: "app-1",
        userId: "u1",
        familyId: "fam",
        revokedAt: null,
        supersededAt: null,
        expiresAt: new Date(Date.now() + 10_000),
        app,
        user,
    };

    it("rotates a live token", async () => {
        const { service, refreshTokens } = build();
        refreshTokens.findByToken.mockResolvedValue(live);

        const result = await service.refresh({
            grant_type: "refresh_token",
            client_id: "app-1",
            refresh_token: "zrt_live",
        });

        expect(result.response.refreshToken).toBe("zrt_rotated");
        expect(refreshTokens.rotate).toHaveBeenCalledWith(live);
    });

    it("detects reuse of a rotated token and revokes the family", async () => {
        const { service, refreshTokens } = build();
        refreshTokens.findByToken.mockResolvedValue({
            ...live,
            supersededAt: new Date(),
        });

        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_old",
            }),
        ).rejects.toMatchObject({ reason: "reuse" });
        expect(refreshTokens.revokeFamily).toHaveBeenCalledWith("fam");
        expect(refreshTokens.rotate).not.toHaveBeenCalled();
    });

    it("rejects an explicitly revoked token without raising the reuse alarm", async () => {
        const { service, refreshTokens } = build();
        refreshTokens.findByToken.mockResolvedValue({
            ...live,
            revokedAt: new Date(),
        });

        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_old",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(refreshTokens.revokeFamily).not.toHaveBeenCalled();
    });

    it("rejects tokens from another app, unknown or expired tokens", async () => {
        const { service, refreshTokens } = build();

        refreshTokens.findByToken.mockResolvedValueOnce(null);
        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_x",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        refreshTokens.findByToken.mockResolvedValueOnce({
            ...live,
            appId: "app-2",
        });
        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_x",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);

        refreshTokens.findByToken.mockResolvedValueOnce({
            ...live,
            expiresAt: new Date(0),
        });
        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_x",
            }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("revokes the family when the user lost access", async () => {
        const { service, refreshTokens } = build();
        refreshTokens.findByToken.mockResolvedValue({
            ...live,
            user: { ...user, disabledAt: new Date() },
        });

        await expect(
            service.refresh({
                grant_type: "refresh_token",
                client_id: "app-1",
                refresh_token: "zrt_live",
            }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(refreshTokens.revokeFamily).toHaveBeenCalledWith("fam");
    });
});
