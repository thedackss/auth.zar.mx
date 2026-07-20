import type { Prisma } from "@/prisma/generated/client";
import type { AuthEventType } from "@/prisma/generated/enums";

export interface RecordEventProps {
    type: AuthEventType;
    userId?: string;
    actorId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
}
