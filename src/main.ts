import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
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
    // Security headers for the panel, the API and Bull Board. The CSP allows
    // what those actually use: same-origin scripts (Bull Board's config is a
    // non-executable application/json script), inline style attributes
    // (React and Bull Board) and the panel's Google font. Swagger UI needs
    // inline scripts, so the CSP is dev-off along with it.
    app.use(
        helmet({
            contentSecurityPolicy:
                env.NODE_ENV === "production"
                    ? {
                          directives: {
                              defaultSrc: ["'self'"],
                              scriptSrc: ["'self'"],
                              styleSrc: [
                                  "'self'",
                                  "'unsafe-inline'",
                                  "https://fonts.googleapis.com",
                              ],
                              fontSrc: [
                                  "'self'",
                                  "https://fonts.gstatic.com",
                                  "data:",
                              ],
                              imgSrc: ["'self'", "data:"],
                              connectSrc: ["'self'"],
                              frameAncestors: ["'none'"],
                              objectSrc: ["'none'"],
                              baseUri: ["'self'"],
                              formAction: ["'self'"],
                          },
                      }
                    : false,
            // Cloudflare already sets HSTS at the edge.
            strictTransportSecurity: false,
        }),
    );
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
