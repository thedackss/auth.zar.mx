import { SettingsService } from "./settings.service";

// isSignupAllowed now only reflects the signupEnabled flag; app-mediated
// sign-up authorization lives in AppsService (per-app public/grants).
describe("SettingsService.isSignupAllowed", () => {
    function serviceWithRow(row: { signupEnabled: boolean } | null) {
        const prisma = {
            client: {
                appSettings: {
                    findUnique: jest.fn().mockResolvedValue(row),
                },
            },
        };

        // biome-ignore lint/suspicious/noExplicitAny: minimal prisma stub
        return new SettingsService(prisma as any);
    }

    it("allows sign-up while enabled", async () => {
        const service = serviceWithRow({ signupEnabled: true });
        await expect(service.isSignupAllowed()).resolves.toBe(true);
    });

    it("denies sign-up while disabled", async () => {
        const service = serviceWithRow({ signupEnabled: false });
        await expect(service.isSignupAllowed()).resolves.toBe(false);
    });

    it("denies sign-up when no settings row exists (safe default)", async () => {
        const service = serviceWithRow(null);
        await expect(service.isSignupAllowed()).resolves.toBe(false);
    });
});
