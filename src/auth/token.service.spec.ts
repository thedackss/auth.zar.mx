import type { App, User } from "@/prisma/generated/client";
import { TokenService } from "./token.service";

jest.mock("@/env", () => ({
    env: {
        AUTH_SECRET: "test-secret-at-least-16-chars",
        JWT_TTL_SECONDS: 60,
    },
}));

const user = {
    id: "user-1",
    email: "diego@geoil.com",
    role: "ADMIN",
} as User;

const app = {
    id: "app-1",
    name: "anyxa",
} as App;

const otherApp = {
    id: "app-2",
    name: "other",
} as App;

describe("TokenService", () => {
    const service = new TokenService();

    it("signs a token that verifies back to the same identity", () => {
        const { accessToken, tokenType, expiresIn } = service.sign(user, app);

        expect(tokenType).toBe("Bearer");
        expect(expiresIn).toBe(60);

        const payload = service.verify(accessToken);
        expect(payload.sub).toBe(user.id);
        expect(payload.email).toBe(user.email);
        expect(payload.role).toBe("ADMIN");
        expect(payload.aud).toBe(app.id);
        expect(payload.app).toBe(app.name);
    });

    it("verifies against the expected audience", () => {
        const { accessToken } = service.sign(user, app);

        expect(() => service.verify(accessToken, app.id)).not.toThrow();
    });

    it("rejects a token issued for another app", () => {
        const { accessToken } = service.sign(user, otherApp);

        expect(() => service.verify(accessToken, app.id)).toThrow();
    });

    it("rejects a tampered token", () => {
        const { accessToken } = service.sign(user, app);
        const tampered = `${accessToken.slice(0, -2)}xx`;

        expect(() => service.verify(tampered)).toThrow();
    });
});
