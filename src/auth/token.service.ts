import { Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import type { App, User } from "@/prisma/generated/client";

export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: string;
    /** Audience: id of the app the token was issued for. */
    aud: string;
    /** Human-readable name of that app. */
    app: string;
}

/**
 * Exchanges a session-authenticated user for a short-lived JWT that other
 * services verify offline with AUTH_SECRET (HS256). The token intentionally
 * carries only identity + role: each service maps roles to its own
 * permissions locally. Tokens are app-scoped: the audience is the id of the
 * app they were issued for, and apps must reject other audiences.
 */
@Injectable()
export class TokenService {
    public sign(user: User, app: App) {
        const accessToken = jwt.sign(
            { email: user.email, role: user.role, app: app.name },
            env.AUTH_SECRET,
            {
                algorithm: "HS256",
                subject: user.id,
                audience: app.id,
                expiresIn: env.JWT_TTL_SECONDS,
                issuer: "zar-auth",
            },
        );

        return {
            accessToken,
            tokenType: "Bearer" as const,
            expiresIn: env.JWT_TTL_SECONDS,
        };
    }

    public verify(token: string, audience?: string): AccessTokenPayload {
        return jwt.verify(token, env.AUTH_SECRET, {
            algorithms: ["HS256"],
            issuer: "zar-auth",
            audience,
        }) as AccessTokenPayload;
    }
}
