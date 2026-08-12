import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuditService } from "@/audit/audit.service";
import { requestMeta } from "@/audit/request-meta";
import { RequirePermissions } from "@/auth/decorators/require-permissions.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/prisma/generated/client";
import { AppsService } from "./apps.service";
import { AccessParamsDto } from "./dto/access-params.dto";
import { CreateAppDto } from "./dto/create-app.dto";
import { FindOneAppDto } from "./dto/find-one-app.dto";
import { GrantAccessDto } from "./dto/grant-access.dto";
import { UpdateAppDto } from "./dto/update-app.dto";

@ApiTags("apps")
@Controller("apps")
export class AppsController {
    constructor(
        private readonly apps: AppsService,
        private readonly audit: AuditService,
    ) {}

    @Get()
    @RequirePermissions("apps.manage")
    public async findAll() {
        const data = await this.apps.findAll();
        return { data, message: "Apps retrieved successfully" };
    }

    @Post()
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.CREATED)
    public async create(
        @Body() body: CreateAppDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const data = await this.apps.create(body);

        await this.audit.record({
            type: "APP_CREATED",
            userId: admin.id,
            actorId: admin.id,
            metadata: { appId: data.app.id, appName: data.app.name },
            ...requestMeta(req),
        });

        return {
            data,
            message: `App (${data.app.name}) created. Store the key now — it is shown only once.`,
        };
    }

    @Patch(":id")
    @RequirePermissions("apps.manage")
    public async update(
        @Param() { id }: FindOneAppDto,
        @Body() body: UpdateAppDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const data = await this.apps.update(id, body);

        await this.audit.record({
            type: "APP_UPDATED",
            userId: admin.id,
            actorId: admin.id,
            metadata: { appId: id, changes: body as object },
            ...requestMeta(req),
        });

        return { data, message: `App (${data.name}) updated successfully` };
    }

    @Post(":id/key")
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.OK)
    public async regenerateKey(
        @Param() { id }: FindOneAppDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const data = await this.apps.regenerateKey(id);

        await this.audit.record({
            type: "APP_KEY_REGENERATED",
            userId: admin.id,
            actorId: admin.id,
            metadata: { appId: id, appName: data.app.name },
            ...requestMeta(req),
        });

        return {
            data,
            message: `App (${data.app.name}) key regenerated. The previous key no longer works; store the new one now — it is shown only once.`,
        };
    }

    @Post(":id/revoke")
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.OK)
    public async revoke(
        @Param() { id }: FindOneAppDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const data = await this.apps.revoke(id);

        await this.audit.record({
            type: "APP_REVOKED",
            userId: admin.id,
            actorId: admin.id,
            metadata: { appId: id, appName: data.name },
            ...requestMeta(req),
        });

        return {
            data,
            message: `App (${data.name}) revoked: its key is rejected until regenerated`,
        };
    }

    @Delete(":id")
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.OK)
    public async remove(
        @Param() { id }: FindOneAppDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const app = await this.apps.check(id);
        await this.apps.remove(id);

        await this.audit.record({
            type: "APP_REVOKED",
            userId: admin.id,
            actorId: admin.id,
            metadata: { appId: id, appName: app.name, deleted: true },
            ...requestMeta(req),
        });

        return { data: null, message: `App (${app.name}) deleted` };
    }

    @Get(":id/access")
    @RequirePermissions("apps.manage")
    public async listAccess(@Param() { id }: FindOneAppDto) {
        const data = await this.apps.listAccess(id);
        return { data, message: "Access grants retrieved successfully" };
    }

    @Post(":id/access")
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.CREATED)
    public async grant(
        @Param() { id }: FindOneAppDto,
        @Body() body: GrantAccessDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const data = await this.apps.grant(id, body.email, admin.id);

        await this.audit.record({
            type: "APP_ACCESS_GRANTED",
            userId: data.userId ?? undefined,
            actorId: admin.id,
            email: body.email,
            metadata: { appId: id },
            ...requestMeta(req),
        });

        return {
            data,
            message: data.userId
                ? `Access granted to existing user ${body.email}`
                : `Access pre-authorized for ${body.email}: they can now sign up through this app`,
        };
    }

    @Delete(":id/access/:accessId")
    @RequirePermissions("apps.manage")
    @HttpCode(HttpStatus.OK)
    public async revokeAccess(
        @Param() { id, accessId }: AccessParamsDto,
        @CurrentUser() admin: User,
        @Req() req: Request,
    ) {
        const access = await this.apps.revokeAccess(id, accessId);

        await this.audit.record({
            type: "APP_ACCESS_REVOKED",
            userId: access.userId ?? undefined,
            actorId: admin.id,
            email: access.email ?? undefined,
            metadata: { appId: id },
            ...requestMeta(req),
        });

        return { data: null, message: "Access revoked successfully" };
    }
}
