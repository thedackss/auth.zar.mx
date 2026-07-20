import { Role } from "@/prisma/generated/client";

/**
 * Permissions owned by the auth service itself, following the
 * "each service defines its own role -> permission map" pattern.
 * Other services define their own maps; the JWT only carries the role.
 */
export const PERMISSIONS = [
    "users.read",
    "users.roles.assign",
    "users.disable",
    "settings.manage",
    "queues.read",
    "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
    [Role.ADMIN]: PERMISSIONS,
    [Role.USER]: [],
};

export const permissionsForRole = (role: Role): readonly Permission[] =>
    ROLE_PERMISSIONS[role] ?? [];
