import { applyDecorators, UseGuards } from "@nestjs/common";
import { AuthenticatedGuard } from "@/auth/guards/authenticated.guard";

export const Authenticated = () =>
    applyDecorators(UseGuards(AuthenticatedGuard));
