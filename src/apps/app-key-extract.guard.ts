import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AppsService } from "./apps.service";

/**
 * Global, never blocks: resolves a valid X-App-Key onto req.zarApp for any
 * route, so that rate limiting and the audit log can trust the forwarded
 * client headers (see common/client-ip.ts) on proxied calls such as an app
 * backend hitting /sign-in. Routes that require an app still use
 * AppKeyGuard, which rejects when nothing was resolved.
 */
@Injectable()
export class AppKeyExtractGuard implements CanActivate {
    constructor(private readonly apps: AppsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const key = req.header("x-app-key");
        if (!key) return true;

        const app = await this.apps.findByKey(key);
        if (app) req.zarApp = app;

        return true;
    }
}
