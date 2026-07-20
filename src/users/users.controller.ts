import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuditService } from "@/audit/audit.service";
import { requestMeta } from "@/audit/request-meta";
import { RequirePermissions } from "@/auth/decorators/require-permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/prisma/generated/client";
import { SessionsService } from "@/sessions/sessions.service";
import { FindOneUserDto } from "./dto/find-one.dto";
import { UpdateUserRoleDto } from "./dto/update-role.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiCookieAuth()
@Controller("users")
export class UsersController {
    constructor(
        private readonly users: UsersService,
        private readonly sessions: SessionsService,
        private readonly audit: AuditService,
    ) {}

    @Get()
    @RequirePermissions("users.read")
    public async findAll() {
        const data = await this.users.findAll();
        return { data, message: "Users retrieved successfully" };
    }

    @Get(":id")
    @RequirePermissions("users.read")
    public async findOne(@Param() { id }: FindOneUserDto) {
        const data = await this.users.check({ id });
        return {
            data,
            message: `User (${data.email}) retrieved successfully`,
        };
    }

    @Patch(":id/role")
    @RequirePermissions("users.roles.assign")
    public async setRole(
        @CurrentUser() currentUser: User,
        @Param() { id }: FindOneUserDto,
        @Body() body: UpdateUserRoleDto,
        @Req() req: Request,
    ) {
        if (id === currentUser.id)
            throw new ForbiddenException("You cannot change your own role");

        const previous = await this.users.check({ id });
        const data = await this.users.update({
            id,
            data: { role: body.role },
        });

        await this.audit.record({
            type: "ROLE_CHANGED",
            userId: id,
            actorId: currentUser.id,
            metadata: { from: previous.role, to: body.role },
            ...requestMeta(req),
        });

        return {
            data,
            message: `User (${data.email}) role updated to ${data.role}`,
        };
    }

    @Post(":id/disable")
    @RequirePermissions("users.disable")
    @HttpCode(HttpStatus.OK)
    public async disable(
        @CurrentUser() currentUser: User,
        @Param() { id }: FindOneUserDto,
        @Req() req: Request,
    ) {
        if (id === currentUser.id)
            throw new ForbiddenException("You cannot disable your own account");

        const data = await this.users.update({
            id,
            data: { disabledAt: new Date() },
        });
        await this.sessions.destroyAll(id);

        await this.audit.record({
            type: "ACCOUNT_DISABLED",
            userId: id,
            actorId: currentUser.id,
            ...requestMeta(req),
        });

        return {
            data,
            message: `User (${data.email}) disabled and signed out everywhere`,
        };
    }

    @Post(":id/enable")
    @RequirePermissions("users.disable")
    @HttpCode(HttpStatus.OK)
    public async enable(
        @CurrentUser() currentUser: User,
        @Param() { id }: FindOneUserDto,
        @Req() req: Request,
    ) {
        const data = await this.users.update({
            id,
            data: { disabledAt: null },
        });

        await this.audit.record({
            type: "ACCOUNT_ENABLED",
            userId: id,
            actorId: currentUser.id,
            ...requestMeta(req),
        });

        return { data, message: `User (${data.email}) enabled` };
    }
}
