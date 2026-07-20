import type { User } from "@/prisma/generated/client";
import type { SessionData } from "@/sessions/interfaces/session.interface";

declare module "express" {
    interface Request {
        session?: SessionData;
        sessionId?: string;
        user?: User;
    }
}
