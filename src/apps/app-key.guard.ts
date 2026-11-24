import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

// Server-to-server auth for registered apps: the app's backend sends its
// API key in X-App-Key. The key itself is resolved onto req.zarApp by the
// global AppKeyExtractGuard; this guard only enforces that it happened.
@Injectable()
export class AppKeyGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();

        if (!req.header("x-app-key"))
            throw new UnauthorizedException("Missing X-App-Key header");
        if (!req.zarApp)
            throw new UnauthorizedException("Invalid or revoked app key");

        return true;
    }
}
