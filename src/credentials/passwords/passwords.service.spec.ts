import { createHash } from "node:crypto";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcryptjs from "bcryptjs";
import { PrismaService } from "@/prisma/prisma.service";
import { PasswordsService } from "./passwords.service";

describe("PasswordsService", () => {
    let service: PasswordsService;
    let findFirst: jest.Mock;

    beforeEach(async () => {
        findFirst = jest.fn().mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PasswordsService,
                {
                    provide: PrismaService,
                    useValue: {
                        client: {
                            authCredential: { findFirst },
                        },
                    },
                },
            ],
        }).compile();

        service = module.get(PasswordsService);
    });

    describe("verify", () => {
        it("returns false when no credential exists for the user", async () => {
            const result = await service.verify({
                userId: "any-id",
                password: "anything",
            });

            expect(result).toBe(false);
        });

        it("returns true when the password matches the stored hash", async () => {
            const password = "MyPassword123!";
            const preHashed = createHash("sha256")
                .update(password)
                .digest("base64");
            const passHash = await bcryptjs.hash(preHashed, 12);

            findFirst.mockResolvedValueOnce({
                userId: "user-1",
                provider: "password",
                passHash,
                passAlgorithm: "sha256+bcrypt",
            });

            const result = await service.verify({
                userId: "user-1",
                password,
            });

            expect(result).toBe(true);
        });

        it("returns false when the password does not match the stored hash", async () => {
            const password = "MyPassword123!";
            const preHashed = createHash("sha256")
                .update(password)
                .digest("base64");
            const passHash = await bcryptjs.hash(preHashed, 12);

            findFirst.mockResolvedValueOnce({
                userId: "user-1",
                provider: "password",
                passHash,
                passAlgorithm: "sha256+bcrypt",
            });

            const result = await service.verify({
                userId: "user-1",
                password: "WrongPassword!",
            });

            expect(result).toBe(false);
        });

        it("returns false when the credential exists but has an unsupported algorithm", async () => {
            findFirst.mockResolvedValueOnce({
                userId: "user-1",
                provider: "password",
                passHash: "somehash",
                passAlgorithm: "unsupported-algorithm",
            });

            const result = await service.verify({
                userId: "user-1",
                password: "AnyPassword!",
            });

            expect(result).toBe(false);
        });

        it("returns false when the credential exists but has no passHash", async () => {
            findFirst.mockResolvedValueOnce({
                userId: "user-1",
                provider: "password",
                passHash: null,
                passAlgorithm: "sha256+bcrypt",
            });

            const result = await service.verify({
                userId: "user-1",
                password: "AnyPassword!",
            });

            expect(result).toBe(false);
        });
    });
});
