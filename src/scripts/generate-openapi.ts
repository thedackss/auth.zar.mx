import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "@/app.module";
import { createSwaggerDocument } from "@/common/swagger/swagger.config";

const OUTPUT_PATH = resolve(process.cwd(), "openapi.json");

// Emits the OpenAPI document to `openapi.json` without starting the HTTP server.
// `preview: true` builds the full module/route graph (enough for Swagger's
// metadata scan) while skipping provider lifecycle hooks, so it never opens the
// Postgres/Redis connections that `onModuleInit` would otherwise require.
async function generateOpenApi(): Promise<void> {
    const app = await NestFactory.create(AppModule, {
        preview: true,
        logger: false,
    });

    // Mirror main.ts so the exported spec carries the same /api prefix.
    app.setGlobalPrefix("api");

    const document = createSwaggerDocument(app);
    writeFileSync(OUTPUT_PATH, `${JSON.stringify(document, null, 2)}\n`);
    await app.close();

    process.stdout.write(`OpenAPI spec written to ${OUTPUT_PATH}\n`);
}

generateOpenApi().catch((error) => {
    process.stderr.write(`Failed to generate OpenAPI spec: ${error}\n`);
    process.exit(1);
});
