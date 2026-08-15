import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { AppModule } from "@/app.module";
import { AppsService } from "@/apps/apps.service";
import { setupQueueDashboard } from "@/common/bull-board/bull-board.config";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { TransformInterceptor } from "@/common/interceptors/transform.interceptor";
import { setupSwagger } from "@/common/swagger/swagger.config";
import { env } from "@/env";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    app.useLogger(app.get(Logger));
    app.enableShutdownHooks();
    app.setGlobalPrefix("api");
    app.set("trust proxy", 1);
    // Allowed origins: the static env list plus the urls of registered
    // (non-revoked) apps, so new apps work without touching CORS_ORIGINS.
    const apps = app.get(AppsService);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || env.CORS_ORIGINS.includes(origin)) {
                callback(null, true);
                return;
            }

            apps.isAllowedOrigin(origin).then(
                (allowed) => callback(null, allowed),
                (error) => callback(error, false),
            );
        },
        credentials: true,
    });
    app.use(cookieParser());
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    if (env.NODE_ENV !== "production") setupSwagger(app);
    setupQueueDashboard(app);

    await app.listen(env.PORT);
}
bootstrap();
