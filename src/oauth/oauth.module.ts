import { Module } from "@nestjs/common";
import { AppsModule } from "@/apps/apps.module";
import { AuditModule } from "@/audit/audit.module";
import { AuthModule } from "@/auth/auth.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { RedisModule } from "@/redis/redis.module";
import { OauthController } from "./oauth.controller";
import { OauthService } from "./oauth.service";
import { RefreshTokensModule } from "./refresh-tokens.module";

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        AppsModule,
        AuthModule,
        AuditModule,
        RefreshTokensModule,
    ],
    controllers: [OauthController],
    providers: [OauthService],
})
export class OauthModule {}
