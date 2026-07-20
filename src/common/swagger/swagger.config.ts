import type { INestApplication } from "@nestjs/common";
import {
    DocumentBuilder,
    type OpenAPIObject,
    SwaggerModule,
} from "@nestjs/swagger";
import { env } from "@/env";

// Shared so both the live `/docs` endpoint and the offline spec export
// (`scripts/generate-openapi.ts`) build an identical document.
export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
        .setTitle("Zar Auth API")
        .setDescription("Authentication and authorization service for zar.mx")
        .setVersion("1.0")
        .addCookieAuth(env.SESSION_COOKIE_NAME)
        .build();

    return SwaggerModule.createDocument(app, config);
}

export function setupSwagger(app: INestApplication): void {
    const document = createSwaggerDocument(app);
    SwaggerModule.setup("docs", app, document, {
        swaggerOptions: { withCredentials: true },
    });
}
