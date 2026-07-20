import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { FindCredentialProps } from "./interfaces/find.interface";
import { FindAllCredentialsProps } from "./interfaces/find-all.interface";
import { PasswordsService } from "./passwords/passwords.service";

@Injectable()
export class CredentialsService {
    constructor(
        private readonly prisma: PrismaService,
        public readonly passwords: PasswordsService,
    ) {}

    public async findAll(props: FindAllCredentialsProps) {
        return await this.prisma.client.authCredential.findMany({
            where: { userId: props.userId },
        });
    }

    public async find(props: FindCredentialProps) {
        return await this.prisma.client.authCredential.findFirst({
            where: { userId: props.userId, provider: props.provider },
        });
    }

    public async check(props: FindCredentialProps) {
        const credential = await this.find(props);
        if (!credential)
            throw new NotFoundException(
                `Credential for provider ${props.provider} not found for this user`,
            );

        return credential;
    }
}
