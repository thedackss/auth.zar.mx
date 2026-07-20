import { createHash } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcryptjs from "bcryptjs";
import { PrismaTx } from "@/prisma/interfaces/transaction.interface";
import { PrismaService } from "@/prisma/prisma.service";
import { CreatePasswordProps } from "./interfaces/create.interface";
import { UpdatePasswordProps } from "./interfaces/update.interface";
import { VerifyPasswordProps } from "./interfaces/verify.interface";

const PROVIDER = "password" as const;

@Injectable()
export class PasswordsService {
    constructor(private readonly prisma: PrismaService) {}

    private readonly algorithm = "sha256+bcrypt";

    private readonly dummyHash = bcryptjs.hashSync("dummy_password", 12);

    private preHash(password: string): string {
        return createHash("sha256").update(password).digest("base64");
    }

    private async hash(password: string): Promise<string> {
        const preHashed = this.preHash(password);
        return await bcryptjs.hash(preHashed, 12);
    }

    private async compare(password: string, hash: string) {
        return await bcryptjs.compare(this.preHash(password), hash);
    }

    public async verify(props: VerifyPasswordProps) {
        const credential = await this.prisma.client.authCredential.findFirst({
            where: { userId: props.userId, provider: PROVIDER },
        });

        if (
            !credential ||
            credential.passAlgorithm !== this.algorithm ||
            !credential.passHash
        ) {
            return await this.compare(props.password, this.dummyHash);
        }

        return await this.compare(props.password, credential.passHash);
    }

    public async create(props: CreatePasswordProps, tx?: PrismaTx) {
        const client = tx ?? this.prisma.client;

        const passHash = await this.hash(props.password);

        const credential = await client.authCredential
            .create({
                data: {
                    userId: props.userId,

                    provider: PROVIDER,
                    providerAccountId: props.userId,

                    passHash,
                    passAlgorithm: this.algorithm,
                },
            })
            .catch(
                this.prisma.catchKnownErrors({
                    P2002: `Credential for provider "${PROVIDER}" already exists for this user`,
                    P2003: `User with id ${props.userId} does not exist`,
                    P2025: `User with id ${props.userId} does not exist`,
                }),
            );

        return credential;
    }

    /**
     * Creates or replaces the password without requiring the current one.
     * Only for token-verified flows (set-password invites, password resets).
     */
    public async set(props: CreatePasswordProps) {
        const passHash = await this.hash(props.password);

        return await this.prisma.client.authCredential
            .upsert({
                where: {
                    userId_provider: {
                        userId: props.userId,
                        provider: PROVIDER,
                    },
                },
                create: {
                    userId: props.userId,
                    provider: PROVIDER,
                    providerAccountId: props.userId,
                    passHash,
                    passAlgorithm: this.algorithm,
                },
                update: { passHash, passAlgorithm: this.algorithm },
            })
            .catch(
                this.prisma.catchKnownErrors({
                    P2003: `User with id ${props.userId} does not exist`,
                    P2025: `User with id ${props.userId} does not exist`,
                }),
            );
    }

    public async update(props: UpdatePasswordProps) {
        const { userId, password, newPassword } = props;
        const isValid = await this.verify({ userId, password });

        if (!isValid)
            throw new UnauthorizedException("Current password is incorrect");

        const passHash = await this.hash(newPassword);

        return await this.prisma.client.authCredential.update({
            where: { userId_provider: { userId, provider: PROVIDER } },
            data: { passHash, passAlgorithm: this.algorithm },
        });
    }
}
