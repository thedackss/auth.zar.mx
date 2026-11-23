import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { AppsService } from "@/apps/apps.service";
import { env } from "@/env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF protection for cookie-authenticated, state-changing requests.
 *
 * SameSite=Strict is not enough here: every `*.zar.mx` host is same-site
 * with auth.zar.mx, and a form POST (urlencoded, no CORS preflight) from any
 * of them would ride the admin's cookie. Browsers always send `Origin` on
 * cross-origin POSTs and on form submissions, so when a request carries a
 * session cookie and an Origin, that Origin must be this panel's, a
 * configured CORS origin, or a registered app's.
 *
 * Requests without Origin (server-to-server calls such as an app backend
 * proxying `/app/token`, curl, Bruno) are left alone: they have no ambient
 * browser cookie to abuse.
 */
@Injectable()
export class CsrfOriginGuard implements CanActivate {
    private readonly panelOrigin = new URL(env.APP_URL).origin;

    constructor(private readonly apps: AppsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        if (SAFE_METHODS.has(req.method)) return true;
        if (!req.cookies?.[env.SESSION_COOKIE_NAME]) return true;

        const origin = req.header("origin");
        if (!origin) return true;

        if (
            origin === this.panelOrigin ||
            env.CORS_ORIGINS.includes(origin) ||
            (await this.apps.isAllowedOrigin(origin))
        ) {
            return true;
        }

        throw new ForbiddenException("Request origin is not allowed");
    }
}
