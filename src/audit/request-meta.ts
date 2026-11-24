import type { Request } from "express";
import { clientIp, clientUserAgent } from "@/common/client-ip";

/** ip + userAgent of the real client, for audit rows. */
export const requestMeta = (req: Request) => ({
    ip: clientIp(req),
    userAgent: clientUserAgent(req),
});
