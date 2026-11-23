import { ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import type { App, User } from "@/prisma/generated/client";
import { AppGatewayController } from "./app-gateway.controller";

jest.mock("@/env", () => ({ env: {} }));

const app = (overrides: Partial<App> = {}): App =>
    ({ id: "app-1", name: "demo", public: false, ...overrides }) as App;

const user = (overrides: Partial<User> = {}): User =>
    ({
        id: "u1",
        email: "user@domain.tld",
        role: "USER",
        emailVerifiedAt: new Date(),
        ...overrides,
    }) as User;

const req = { headers: {}, ip: "127.0.0.1" } as unknown as Request;

describe("AppGatewayController.token", () => {
    const apps = { hasAccess: jest.fn() };
    const tokens = { sign: jest.fn(() => ({ accessToken: "jwt" })) };
    const audit = { record: jest.fn() };
    const prisma = { client: { $transaction: jest.fn() } };

    const controller = new AppGatewayController(
        apps as never,
        {} as never,
        {} as never,
        {} as never,
        tokens as never,
        audit as never,
        prisma as never,
    );

    beforeEach(() => jest.clearAllMocks());

    it("issues a token and audits it when the user has access", async () => {
        apps.hasAccess.mockResolvedValue(true);

        const res = await controller.token(app(), user(), req);

        expect(res.data).toEqual({ accessToken: "jwt" });
        expect(audit.record).toHaveBeenCalledWith(
            expect.objectContaining({ type: "APP_TOKEN_ISSUED", userId: "u1" }),
        );
    });

    it("refuses unverified users on private apps before checking grants", async () => {
        await expect(
            controller.token(app(), user({ emailVerifiedAt: null }), req),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(apps.hasAccess).not.toHaveBeenCalled();
        expect(tokens.sign).not.toHaveBeenCalled();
    });

    it("lets unverified users into public apps", async () => {
        apps.hasAccess.mockResolvedValue(true);

        await expect(
            controller.token(
                app({ public: true }),
                user({ emailVerifiedAt: null }),
                req,
            ),
        ).resolves.toMatchObject({ data: { accessToken: "jwt" } });
    });

    it("audits and refuses users without a grant", async () => {
        apps.hasAccess.mockResolvedValue(false);

        await expect(
            controller.token(app(), user(), req),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(audit.record).toHaveBeenCalledWith(
            expect.objectContaining({ type: "APP_TOKEN_DENIED" }),
        );
        expect(tokens.sign).not.toHaveBeenCalled();
    });
});

describe("AppGatewayController.signUp", () => {
    const apps = { hasEmailGrant: jest.fn() };
    const audit = { record: jest.fn() };
    const verification = { issue: jest.fn() };
    const prisma = { client: { $transaction: jest.fn() } };

    const controller = new AppGatewayController(
        apps as never,
        {} as never,
        {} as never,
        verification as never,
        {} as never,
        audit as never,
        prisma as never,
    );

    beforeEach(() => jest.clearAllMocks());

    it("audits a refused private sign-up with the reason", async () => {
        apps.hasEmailGrant.mockResolvedValue(false);

        await expect(
            controller.signUp(
                app(),
                { email: "x@domain.tld", password: "Str0ng!pass" },
                req,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);

        expect(prisma.client.$transaction).not.toHaveBeenCalled();
        expect(verification.issue).not.toHaveBeenCalled();
        expect(audit.record).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "SIGN_UP_FAILURE",
                email: "x@domain.tld",
                metadata: expect.objectContaining({
                    appId: "app-1",
                    reason: expect.stringContaining("private"),
                }),
            }),
        );
    });
});
