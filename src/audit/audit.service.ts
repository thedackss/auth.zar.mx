import { Injectable, Logger } from "@nestjs/common";
import { paginate } from "@/common/utils/pagination";
import type { AuthEventType, Prisma } from "@/prisma/generated/client";
import { PrismaService } from "@/prisma/prisma.service";
import type { AuditEventsQueryDto } from "./dto/audit-events-query.dto";
import { RecordEventProps } from "./interfaces/record.interface";

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Records an audit event. Never throws: a failing audit insert must not
     * break the request it describes.
     */
    public async record(props: RecordEventProps): Promise<void> {
        try {
            await this.prisma.client.authEvent.create({ data: props });
        } catch (error) {
            this.logger.error(
                { err: error, event: props.type },
                "Failed to record auth event",
            );
        }
    }

    public async findAll(query: AuditEventsQueryDto) {
        const where: Prisma.AuthEventWhereInput = {};
        if (query.userId) where.userId = query.userId;
        if (query.type) where.type = query.type as AuthEventType;
        if (query.email) where.email = query.email;

        const [items, total] = await Promise.all([
            this.prisma.client.authEvent.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: query.skip,
                take: query.limit,
            }),
            this.prisma.client.authEvent.count({ where }),
        ]);

        return paginate(items, total, query);
    }
}
