import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AppsService } from "./apps.service";

// Server-to-server auth for registered apps: the app's backend sends its
// API key in X-App-Key. Resolves the app onto the request for @CurrentApp.
@Injectable()
export class AppKeyGuard implements CanActivate {
    constructor(private readonly apps: AppsService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const key = req.header("x-app-key");

        if (!key) throw new UnauthorizedException("Missing X-App-Key header");

        const app = await this.apps.findByKey(key);
        if (!app) throw new UnauthorizedException("Invalid or revoked app key");

        req.zarApp = app;
        return true;
    }
}
