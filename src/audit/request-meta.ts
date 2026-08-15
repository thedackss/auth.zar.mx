import type { Request } from "express";

// In production the request arrives through Cloudflare (tunnel) and Traefik,
// so req.ip — even with `trust proxy` — resolves to an internal proxy hop.
// Cloudflare's CF-Connecting-IP carries the real client; fall back to req.ip
// for dev / direct connections.
export const requestMeta = (req: Request) => {
    const cf = req.headers["cf-connecting-ip"];

    return {
        ip: (Array.isArray(cf) ? cf[0] : cf) ?? req.ip,
        userAgent: req.headers["user-agent"],
    };
};
