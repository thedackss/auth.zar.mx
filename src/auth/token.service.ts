import { Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import type { User } from "@/prisma/generated/client";

export interface AccessTokenPayload {
    sub: string;
    email: string;
    role: string;
}

/**
 * Exchanges a session-authenticated user for a short-lived JWT that other
 * services verify offline with AUTH_SECRET (HS256). The token intentionally
 * carries only identity + role: each service maps roles to its own
 * permissions locally.
 */
@Injectable()
export class TokenService {
    public sign(user: User) {
        const accessToken = jwt.sign(
            { email: user.email, role: user.role },
            env.AUTH_SECRET,
            {
                algorithm: "HS256",
                subject: user.id,
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

    public verify(token: string): AccessTokenPayload {
        return jwt.verify(token, env.AUTH_SECRET, {
            algorithms: ["HS256"],
            issuer: "zar-auth",
        }) as AccessTokenPayload;
    }
}
