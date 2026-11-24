import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import { clientIp } from "@/common/client-ip";

/**
 * Rate-limits by the real client IP (see common/client-ip.ts). Behind
 * Cloudflare + Traefik every request reaches us from the same internal
 * proxy IP, and behind an app backend from that backend, so the default
 * req.ip tracker would put all clients in one shared bucket.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
    protected override async getTracker(req: Request): Promise<string> {
        return clientIp(req) ?? "unknown";
    }
}
