import type { Request } from "express";

// IP is reliable because main.ts sets `trust proxy`.
export const requestMeta = (req: Request) => ({
    ip: req.ip,
    userAgent: req.headers["user-agent"],
});
