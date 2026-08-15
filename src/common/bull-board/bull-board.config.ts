import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueueToken } from "@nestjs/bullmq";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Queue } from "bullmq";
import type { NextFunction, Request, Response } from "express";
import { permissionsForRole } from "@/auth/permissions";
import { EMAIL_QUEUE } from "@/email/email.constants";
import { env } from "@/env";
import { SessionsService } from "@/sessions/sessions.service";
import { UsersService } from "@/users/users.service";

const ROUTE = "/bullmq";

// The dashboard is mounted as plain Express middleware, outside Nest's guard
// pipeline, so it runs its own session check with the same services.
function sessionPermissionGuard(app: NestExpressApplication) {
    const sessions = app.get(SessionsService, { strict: false });
    const users = app.get(UsersService, { strict: false });

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
            const session = sessionId ? await sessions.find(sessionId) : null;
            const user = session
                ? await users.find({ id: session.userId })
                : null;

            if (
                !user ||
                user.disabledAt ||
                !permissionsForRole(user.role).includes("queues.read")
            ) {
                res.status(403).json({
                    message:
                        "Sign in as an admin to access the queue dashboard",
                });
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

export function setupQueueDashboard(app: NestExpressApplication): void {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(ROUTE);

    createBullBoard({
        queues: [
            new BullMQAdapter(app.get<Queue>(getQueueToken(EMAIL_QUEUE)), {
                readOnlyMode: true,
            }),
        ],
        serverAdapter,
    });

    app.use(ROUTE, sessionPermissionGuard(app), serverAdapter.getRouter());
}
