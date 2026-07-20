import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { env } from "@/env";
import { UsersService } from "@/users/users.service";
import { SessionsService } from "./sessions.service";

@Injectable()
export class SessionExtractGuard implements CanActivate {
    constructor(
        private readonly sessions: SessionsService,
        private readonly users: UsersService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        if (!sessionId) return true;

        const session = await this.sessions.find(sessionId);
        if (!session) return true;

        const user = await this.users.find({ id: session.userId });
        // Disabled accounts stay unauthenticated even if a session survived.
        if (!user || user.disabledAt) return true;

        await this.sessions.touch(sessionId, session);

        req.session = session;
        req.sessionId = sessionId;
        req.user = user;

        return true;
    }
}
