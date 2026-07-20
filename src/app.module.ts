import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { AuditModule } from "@/audit/audit.module";
import { AuthModule } from "@/auth/auth.module";
import { loggerConfig } from "@/common/logger/logger.config";
import { CredentialsModule } from "@/credentials/credentials.module";
import { EmailModule } from "@/email/email.module";
import { env } from "@/env";
import { HealthController } from "@/health/health.controller";
import { PrismaModule } from "@/prisma/prisma.module";
import { RedisModule } from "@/redis/redis.module";
import { SessionExtractGuard } from "@/sessions/session-extract.guard";
import { SessionsModule } from "@/sessions/sessions.module";
import { SettingsModule } from "@/settings/settings.module";
import { UsersModule } from "@/users/users.module";

const redisUrl = new URL(env.REDIS_URL);

@Module({
    imports: [
        LoggerModule.forRoot(loggerConfig),
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60_000, limit: 60 }],
            skipIf: () => env.NODE_ENV !== "production",
        }),
        BullModule.forRoot({
            connection: {
                host: redisUrl.hostname,
                port: Number(redisUrl.port) || 6379,
                username: redisUrl.username || undefined,
                password: redisUrl.password || undefined,
                db:
                    redisUrl.pathname.length > 1
                        ? Number(redisUrl.pathname.slice(1))
                        : 0,
            },
        }),
        PrismaModule,
        RedisModule,
        AuditModule,
        UsersModule,
        AuthModule,
        CredentialsModule,
        SessionsModule,
        SettingsModule,
        EmailModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: SessionExtractGuard },
    ],
})
export class AppModule {}
