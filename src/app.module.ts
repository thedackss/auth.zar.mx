import { existsSync } from "node:fs";
import { join } from "node:path";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AppController } from "@/app.controller";
import { AppService } from "@/app.service";
import { AppKeyExtractGuard } from "@/apps/app-key-extract.guard";
import { AppsModule } from "@/apps/apps.module";
import { AuditModule } from "@/audit/audit.module";
import { AuthModule } from "@/auth/auth.module";
import { ClientIpThrottlerGuard } from "@/common/guards/client-ip-throttler.guard";
import { CsrfOriginGuard } from "@/common/guards/csrf-origin.guard";
import { loggerConfig } from "@/common/logger/logger.config";
import { ContactModule } from "@/contact/contact.module";
import { CredentialsModule } from "@/credentials/credentials.module";
import { EmailModule } from "@/email/email.module";
import { env } from "@/env";
import { HealthController } from "@/health/health.controller";
import { OauthModule } from "@/oauth/oauth.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { RedisModule } from "@/redis/redis.module";
import { SessionExtractGuard } from "@/sessions/session-extract.guard";
import { SessionsModule } from "@/sessions/sessions.module";
import { SettingsModule } from "@/settings/settings.module";
import { UsersModule } from "@/users/users.module";

const redisUrl = new URL(env.REDIS_URL);

// Admin panel SPA (panel/dist) served at the root; the API lives under
// /api (global prefix, see main.ts). Skipped when the panel has not been
// built (e.g. backend-only dev, where vite serves it instead).
const panelDist = join(process.cwd(), "panel", "dist");
const panelModule = existsSync(panelDist)
    ? [
          ServeStaticModule.forRoot({
              rootPath: panelDist,
              exclude: ["/api{/*path}", "/docs{/*path}", "/bullmq{/*path}"],
          }),
      ]
    : [];

@Module({
    imports: [
        ...panelModule,
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
        AppsModule,
        CredentialsModule,
        SessionsModule,
        SettingsModule,
        EmailModule,
        ContactModule,
        OauthModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        // Order matters: the app key must be resolved before the throttler
        // and the CSRF guard look at the request.
        { provide: APP_GUARD, useClass: AppKeyExtractGuard },
        { provide: APP_GUARD, useClass: ClientIpThrottlerGuard },
        { provide: APP_GUARD, useClass: CsrfOriginGuard },
        { provide: APP_GUARD, useClass: SessionExtractGuard },
    ],
})
export class AppModule {}
