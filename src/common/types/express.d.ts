import type { App, User } from "@/prisma/generated/client";
import type { SessionData } from "@/sessions/interfaces/session.interface";

declare module "express" {
    interface Request {
        session?: SessionData;
        sessionId?: string;
        user?: User;
        /** Set by AppKeyGuard when a registered app authenticates. */
        zarApp?: App;
    }
}
