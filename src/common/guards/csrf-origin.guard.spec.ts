import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { AppsService } from "@/apps/apps.service";
import { CsrfOriginGuard } from "./csrf-origin.guard";

jest.mock("@/env", () => ({
    env: {
        APP_URL: "https://auth.domain.tld",
        CORS_ORIGINS: ["https://cors.domain.tld"],
        SESSION_COOKIE_NAME: "session.id",
    },
}));

const context = (req: {
    method: string;
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
}) =>
    ({
        switchToHttp: () => ({
            getRequest: () => ({
                ...req,
                header: (name: string) => req.headers?.[name.toLowerCase()],
            }),
        }),
    }) as unknown as ExecutionContext;

describe("CsrfOriginGuard", () => {
    const apps = {
        isAllowedOrigin: jest.fn(async (o: string) => o === "https://app.test"),
    } as unknown as AppsService;
    const guard = new CsrfOriginGuard(apps);
    const cookies = { "session.id": "sid" };

    it("ignores safe methods", async () => {
        await expect(
            guard.canActivate(
                context({
                    method: "GET",
                    cookies,
                    headers: { origin: "https://evil.test" },
                }),
            ),
        ).resolves.toBe(true);
    });

    it("ignores requests without a session cookie", async () => {
        await expect(
            guard.canActivate(
                context({
                    method: "POST",
                    headers: { origin: "https://evil.test" },
                }),
            ),
        ).resolves.toBe(true);
    });

    it("ignores requests without an Origin header (server-to-server)", async () => {
        await expect(
            guard.canActivate(context({ method: "POST", cookies })),
        ).resolves.toBe(true);
    });

    it("allows the panel, CORS_ORIGINS and registered app origins", async () => {
        for (const origin of [
            "https://auth.domain.tld",
            "https://cors.domain.tld",
            "https://app.test",
        ]) {
            await expect(
                guard.canActivate(
                    context({ method: "POST", cookies, headers: { origin } }),
                ),
            ).resolves.toBe(true);
        }
    });

    it("rejects any other origin on a cookie-bearing unsafe request", async () => {
        for (const method of ["POST", "PATCH", "DELETE"]) {
            await expect(
                guard.canActivate(
                    context({
                        method,
                        cookies,
                        headers: { origin: "https://evil.zar.mx" },
                    }),
                ),
            ).rejects.toBeInstanceOf(ForbiddenException);
        }
    });
});
