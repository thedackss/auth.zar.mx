import {
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";
import { asLocale } from "@/common/locale";
import { paginate } from "@/common/utils/pagination";
import { EmailService } from "@/email/email.service";
import { env } from "@/env";
import type { App, Prisma } from "@/prisma/generated/client";
import { PrismaService } from "@/prisma/prisma.service";
import type { MessagesQueryDto } from "./dto/messages-query.dto";
import type { SendMessageDto } from "./dto/send-message.dto";

export interface SendMessageContext {
    ip?: string;
    userAgent?: string;
}

const escapeHtml = (value: string) =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

@Injectable()
export class ContactService {
    private readonly logger = new Logger(ContactService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
    ) {}

    /** Inbox for relayed messages; undefined means the feature is off. */
    private get inbox(): string | undefined {
        return env.CONTACT_TO ?? env.ADMIN_EMAIL;
    }

    public isConfigured(): boolean {
        return this.inbox !== undefined;
    }

    /**
     * Stores the message and queues the notification email. Stored first so
     * a delivery failure (retried by BullMQ) never loses the submission.
     */
    public async send(
        app: App,
        body: SendMessageDto,
        context: SendMessageContext,
    ) {
        const inbox = this.inbox;
        if (!inbox)
            throw new ServiceUnavailableException("Contact is not configured");

        const row = await this.prisma.client.contactMessage.create({
            data: {
                appId: app.id,
                appName: app.name,
                name: body.name,
                email: body.email,
                message: body.message,
                locale: asLocale(body.lang),
                ip: context.ip,
                userAgent: context.userAgent,
            },
        });

        const subject = `[${app.name}] message from ${body.name}`;
        const meta = `${body.name} <${body.email}> via ${app.name}${
            context.ip ? ` (${context.ip})` : ""
        }`;

        await this.email.send({
            to: inbox,
            // Reply straight to the sender from the inbox.
            replyTo: body.email,
            subject,
            text: `${meta}\n\n${body.message}`,
            html: `
            <p><strong>${escapeHtml(meta)}</strong></p>
            <p style="white-space: pre-wrap">${escapeHtml(body.message)}</p>
            `.trim(),
        });

        this.logger.log(`Contact message ${row.id} from ${app.name} queued`);
        return row;
    }

    public async findAll(query: MessagesQueryDto) {
        const where: Prisma.ContactMessageWhereInput = query.unread
            ? { readAt: null }
            : {};

        const [items, total] = await Promise.all([
            this.prisma.client.contactMessage.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: query.skip,
                take: query.limit,
            }),
            this.prisma.client.contactMessage.count({ where }),
        ]);

        return paginate(items, total, query);
    }

    public async setRead(id: string, read: boolean) {
        const row = await this.prisma.client.contactMessage.findUnique({
            where: { id },
        });
        if (!row) throw new NotFoundException("Message not found");

        return this.prisma.client.contactMessage.update({
            where: { id },
            data: { readAt: read ? (row.readAt ?? new Date()) : null },
        });
    }
}
