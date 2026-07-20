import { Module } from "@nestjs/common";
import { CredentialsModule } from "@/credentials/credentials.module";
import { SessionsModule } from "@/sessions/sessions.module";
import { SettingsModule } from "@/settings/settings.module";
import { UsersModule } from "@/users/users.module";
import { AdminBootstrapService } from "./admin-bootstrap.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailVerificationService } from "./email-verification.service";
import { SetPasswordService } from "./set-password.service";
import { TokenService } from "./token.service";

@Module({
    controllers: [AuthController],
    providers: [
        AuthService,
        EmailVerificationService,
        SetPasswordService,
        AdminBootstrapService,
        TokenService,
    ],
    imports: [UsersModule, CredentialsModule, SessionsModule, SettingsModule],
})
export class AuthModule {}
