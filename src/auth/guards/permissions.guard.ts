import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { Permission, permissionsForRole } from "@/auth/permissions";

export const PERMISSIONS_KEY = "permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!required || required.length === 0) return true;

        const { user } = context.switchToHttp().getRequest<Request>();
        const granted = user ? permissionsForRole(user.role) : [];

        if (!required.every((permission) => granted.includes(permission))) {
            throw new ForbiddenException(
                "You do not have permission to perform this action",
            );
        }

        return true;
    }
}
