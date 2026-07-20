import type { Role } from "@/prisma/generated/client";

export interface UpdateUserProps {
    id: string;
    data: {
        email?: string;
        emailVerifiedAt?: Date | null;
        role?: Role;
        disabledAt?: Date | null;
    };
}
