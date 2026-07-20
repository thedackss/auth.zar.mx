import "dotenv/config";
import { Logger } from "@nestjs/common";
import { z } from "zod";

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    PORT: z.coerce.number().int().positive(),
    CORS_ORIGINS: z
        .string()
        .default("")
        .transform((s) =>
            s
                .split(";")
                .map((u) => u.trim())
                .filter(Boolean),
        )
        .pipe(z.array(z.url())),
    APP_URL: z.url(),

    // Email of the user to promote to ADMIN on startup (bootstrap).
    ADMIN_EMAIL: z.email().optional(),

    REDIS_URL: z.url(),
    DATABASE_URL: z.url(),

    AUTH_SECRET: z.string().min(16),
    // Lifetime of the short-lived JWTs minted by POST /auth/token.
    JWT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    SESSION_TTL_SECONDS: z.coerce
        .number()
        .int()
        .positive()
        .default(60 * 60 * 24 * 7),
    SESSION_COOKIE_NAME: z.string().min(1).default("session.id"),

    // "log" prints emails to the console instead of sending them.
    // Defaults to "log" in development and "resend" in production.
    MAIL_DRIVER: z.enum(["log", "resend"]).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(1),
    MAIL_REPLY_TO: z.string().min(1).optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    const { properties } = z.treeifyError(parsed.error);

    if (properties === undefined)
        Logger.error("Failed to parse environment variables", parsed.error);
    else {
        for (const [name, node] of Object.entries(properties)) {
            if (!node) continue;
            Logger.error(
                `Environment variable ${name} is invalid: ${node.errors.join(", ")}`,
            );
        }
    }

    process.exit(1);
}

type Env = z.infer<typeof EnvSchema> & { MAIL_DRIVER: "log" | "resend" };

export const env: Env = {
    ...parsed.data,
    MAIL_DRIVER:
        parsed.data.MAIL_DRIVER ??
        (parsed.data.NODE_ENV === "production" ? "resend" : "log"),
};

if (env.MAIL_DRIVER === "resend" && !env.RESEND_API_KEY) {
    Logger.error(
        "RESEND_API_KEY is required when MAIL_DRIVER is 'resend' " +
            "(the default in production)",
    );
    process.exit(1);
}
