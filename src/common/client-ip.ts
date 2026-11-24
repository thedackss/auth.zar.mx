import { isIP } from "node:net";
import type { Request } from "express";

function header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
}

/**
 * The real client behind a request, for rate limiting and the audit log.
 *
 * In production everything arrives through Cloudflare + Traefik, so req.ip
 * is an internal hop and CF-Connecting-IP carries the visitor. When a
 * registered app's backend acts on behalf of its own visitor (proxied
 * sign-in, sign-up, token exchange), CF-Connecting-IP is that server, so
 * the backend forwards the visitor in X-Client-IP. That header is honoured
 * only on requests authenticated with the key of a *confidential* app
 * (req.zarApp, set by AppKeyExtractGuard): a key that ships in a browser
 * bundle is public, and anyone holding it could spoof the headers.
 */
export function clientIp(req: Request): string | undefined {
    if (req.zarApp?.confidential) {
        const forwarded = header(req, "x-client-ip")?.trim();
        if (forwarded && isIP(forwarded)) return forwarded;
    }

    return header(req, "cf-connecting-ip") ?? req.ip;
}

/** Same trust rule as clientIp(), for the visitor's User-Agent. */
export function clientUserAgent(req: Request): string | undefined {
    if (req.zarApp?.confidential) {
        const forwarded = header(req, "x-client-user-agent");
        if (forwarded) return forwarded.slice(0, 512);
    }

    return header(req, "user-agent");
}
