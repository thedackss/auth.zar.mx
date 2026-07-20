import {
    createParamDecorator,
    ExecutionContext,
    InternalServerErrorException,
} from "@nestjs/common";
import type { Request } from "express";
import type { User } from "@/prisma/generated/client";

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): User => {
        const user = ctx.switchToHttp().getRequest<Request>().user;
        if (!user) {
            throw new InternalServerErrorException(
                "@CurrentUser() used on a route without @Authenticated()",
            );
        }
        return user;
    },
);
