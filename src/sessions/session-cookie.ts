import type { Response } from "express";
import { env } from "@/env";

const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
} as const;

export function setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(env.SESSION_COOKIE_NAME, sessionId, {
        ...options,
        maxAge: env.SESSION_TTL_SECONDS * 1000,
    });
}

export function clearSessionCookie(res: Response): void {
    res.clearCookie(env.SESSION_COOKIE_NAME, options);
}
