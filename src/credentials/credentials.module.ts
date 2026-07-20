import { Module } from "@nestjs/common";
import { CredentialsService } from "./credentials.service";
import { PasswordsService } from "./passwords/passwords.service";

@Module({
    providers: [CredentialsService, PasswordsService],
    exports: [CredentialsService],
})
export class CredentialsModule {}
