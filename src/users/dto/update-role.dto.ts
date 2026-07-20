import { IsEnum } from "class-validator";
import { Role } from "@/prisma/generated/client";

export class UpdateUserRoleDto {
    /**
     * Role to assign to the user.
     * @example "ADMIN"
     */
    @IsEnum(Role)
    role: Role;
}
