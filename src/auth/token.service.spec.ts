import type { User } from "@/prisma/generated/client";
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

describe("TokenService", () => {
    const service = new TokenService();

    it("signs a token that verifies back to the same identity", () => {
        const { accessToken, tokenType, expiresIn } = service.sign(user);

        expect(tokenType).toBe("Bearer");
        expect(expiresIn).toBe(60);

        const payload = service.verify(accessToken);
        expect(payload.sub).toBe(user.id);
        expect(payload.email).toBe(user.email);
        expect(payload.role).toBe("ADMIN");
    });

    it("rejects a tampered token", () => {
        const { accessToken } = service.sign(user);
        const tampered = `${accessToken.slice(0, -2)}xx`;

        expect(() => service.verify(tampered)).toThrow();
    });
});
