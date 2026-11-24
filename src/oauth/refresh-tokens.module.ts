import { Module } from "@nestjs/common";
import { PrismaModule } from "@/prisma/prisma.module";
import { RefreshTokensService } from "./refresh-tokens.service";

// Separate from OauthModule so AppsModule and UsersModule can revoke tokens
// (app revoked, grant removed, user disabled) without a circular import.
@Module({
    imports: [PrismaModule],
    providers: [RefreshTokensService],
    exports: [RefreshTokensService],
})
export class RefreshTokensModule {}
