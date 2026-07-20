import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { CredentialsService } from "@/credentials/credentials.service";
import { PrismaService } from "@/prisma/prisma.service";
import { SettingsService } from "@/settings/settings.service";
import { UsersService } from "@/users/users.service";
import { AuthInput } from "./interfaces/auth-input.interface";
import { ChangePasswordInput } from "./interfaces/change-password.interface";

const NONEXISTENT_USER_ID = "__nonexistent__";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly users: UsersService,
        private readonly credentials: CredentialsService,
        private readonly settings: SettingsService,
    ) {}

    public async signUp({ email, password }: AuthInput) {
        if (!(await this.settings.isSignupAllowed(email)))
            throw new ForbiddenException("Sign-up is currently restricted");

        return await this.prisma.client.$transaction(async (tx) => {
            const user = await this.users.create({ email }, tx);

            await this.credentials.passwords.create(
                { userId: user.id, password },
                tx,
            );

            return user;
        });
    }

    public async signIn({ email, password }: AuthInput) {
        const user = await this.users.find({ email });

        const valid = await this.credentials.passwords.verify({
            userId: user?.id ?? NONEXISTENT_USER_ID,
            password,
        });

        if (!user || !valid)
            throw new UnauthorizedException("Invalid credentials");

        if (user.disabledAt)
            throw new UnauthorizedException("This account has been disabled");

        return user;
    }

    /** Returns the account a recovery email may be sent to, or null. */
    public async findAccountForRecovery(email: string) {
        const user = await this.users.find({ email });
        if (!user || user.disabledAt) return null;
        return user;
    }

    public async changePassword(props: ChangePasswordInput) {
        await this.credentials.passwords.update({
            userId: props.userId,
            password: props.currentPassword,
            newPassword: props.newPassword,
        });
    }
}
