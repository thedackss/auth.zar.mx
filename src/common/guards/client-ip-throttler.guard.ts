import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

/**
 * Rate-limits by the real client IP. Behind Cloudflare + Traefik every
 * request reaches us from the same internal proxy IP, so the default
 * req.ip tracker would put all clients in one shared bucket.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
    protected override async getTracker(req: Request): Promise<string> {
        const cf = req.headers["cf-connecting-ip"];
        return (Array.isArray(cf) ? cf[0] : cf) ?? req.ip ?? "unknown";
    }
}
