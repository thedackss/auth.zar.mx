import {
    applyDecorators,
    createParamDecorator,
    type ExecutionContext,
    UseGuards,
} from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";
import type { Request } from "express";
import { AppKeyGuard } from "../app-key.guard";

export const AppAuthenticated = () =>
    applyDecorators(
        UseGuards(AppKeyGuard),
        ApiHeader({
            name: "X-App-Key",
            description: "The calling app's API key",
            required: true,
        }),
    );

export const CurrentApp = createParamDecorator(
    (_: unknown, context: ExecutionContext) =>
        context.switchToHttp().getRequest<Request>().zarApp,
);
