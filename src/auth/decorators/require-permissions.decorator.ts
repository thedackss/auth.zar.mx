import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "@/auth/guards/authenticated.guard";
import {
    PERMISSIONS_KEY,
    PermissionsGuard,
} from "@/auth/guards/permissions.guard";
import type { Permission } from "@/auth/permissions";

/**
 * Restricts a route to users whose role grants ALL the given permissions.
 * Implies authentication: unauthenticated requests get 401,
 * authenticated-but-missing-permission get 403.
 */
export const RequirePermissions = (...permissions: Permission[]) =>
    applyDecorators(
        SetMetadata(PERMISSIONS_KEY, permissions),
        UseGuards(AuthenticatedGuard, PermissionsGuard),
    );
