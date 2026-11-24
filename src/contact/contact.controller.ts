import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Param,
    Post,
    Query,
    Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import {
    AppAuthenticated,
    CurrentApp,
} from "@/apps/decorators/app-authenticated.decorator";
import { requestMeta } from "@/audit/request-meta";
import { RequirePermissions } from "@/auth/decorators/require-permissions.decorator";
import type { App } from "@/prisma/generated/client";
import { FindOneUserDto } from "@/users/dto/find-one.dto";
import { ContactService } from "./contact.service";
import { MessagesQueryDto } from "./dto/messages-query.dto";
import { SendMessageDto } from "./dto/send-message.dto";

/**
 * Contact-form relay for zar sites. The site's backend forwards the form
 * with its app key (and the visitor's X-Client-IP, which the throttle keys
 * on); the message is stored and emailed to CONTACT_TO. Reading messages
 * is an admin feature of the panel.
 */
@ApiTags("contact")
@Controller("contact")
export class ContactController {
    private readonly logger = new Logger(ContactController.name);

    constructor(private readonly contact: ContactService) {}

    @Post()
    @AppAuthenticated()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.CREATED)
    public async send(
        @CurrentApp() app: App,
        @Body() body: SendMessageDto,
        @Req() req: Request,
    ) {
        // Bots that fill the honeypot get the same answer as everyone else
        // and nothing is stored or sent.
        if (body.website) {
            this.logger.warn(`Honeypot hit from ${app.name}, dropping message`);
            return { data: null, message: "Message received" };
        }

        const row = await this.contact.send(app, body, requestMeta(req));
        return { data: { id: row.id }, message: "Message received" };
    }

    @Get()
    @ApiCookieAuth()
    @RequirePermissions("contact.read")
    public async findAll(@Query() query: MessagesQueryDto) {
        const data = await this.contact.findAll(query);
        return { data, message: "Messages retrieved successfully" };
    }

    @Post(":id/read")
    @ApiCookieAuth()
    @RequirePermissions("contact.read")
    @HttpCode(HttpStatus.OK)
    public async markRead(@Param() { id }: FindOneUserDto) {
        const data = await this.contact.setRead(id, true);
        return { data, message: "Message marked as read" };
    }

    @Post(":id/unread")
    @ApiCookieAuth()
    @RequirePermissions("contact.read")
    @HttpCode(HttpStatus.OK)
    public async markUnread(@Param() { id }: FindOneUserDto) {
        const data = await this.contact.setRead(id, false);
        return { data, message: "Message marked as unread" };
    }
}
