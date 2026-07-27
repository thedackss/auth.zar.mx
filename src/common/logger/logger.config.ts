import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { RequestMethod } from "@nestjs/common";
import type { Params } from "nestjs-pino";
import { env } from "@/env";

const Transport = {
    target: "pino-pretty",
    options: {
        singleLine: true,
        translateTime: "HH:MM:ss.l",
        ignore: "pid,hostname,req,res,responseTime",
    },
} as const;

export const loggerConfig: Params = {
    // nestjs-pino's default is the legacy "*" path, which Nest 11 warns
    // about (LegacyRouteConverter) once the /api global prefix is applied.
    // Same coverage, current Express 5 route syntax.
    forRoutes: [{ path: "{*splat}", method: RequestMethod.ALL }],
    pinoHttp: {
        level: env.NODE_ENV === "production" ? "info" : "debug",
        transport: env.NODE_ENV !== "production" ? Transport : undefined,
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const existing =
                req.headers["x-request-id"] ?? req.headers["x-correlation-id"];
            const id = Array.isArray(existing)
                ? existing[0]
                : (existing ?? randomUUID());
            res.setHeader("x-request-id", id);
            return id;
        },
        serializers: {
            req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
            }),
            res: (res) => ({ statusCode: res.statusCode }),
        },
        customLogLevel: (_req, res, err) => {
            if (res.statusCode >= 500 || err) return "error";
            if (res.statusCode >= 400) return "warn";
            return "info";
        },
        customSuccessMessage: (req, res, responseTime) =>
            `${req.method} ${req.url} ${res.statusCode} (${responseTime}ms)`,
        customErrorMessage: (req, res, err) =>
            `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
        redact: {
            paths: [
                "req.headers.cookie",
                "req.headers.authorization",
                "req.body.password",
                "req.body.currentPassword",
                "req.body.newPassword",
                "*.password",
                "*.currentPassword",
                "*.newPassword",
            ],
            censor: "[REDACTED]",
        },
    },
} as const;
