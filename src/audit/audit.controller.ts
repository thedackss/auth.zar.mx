import { Controller, Get, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@/auth/decorators/require-permissions.decorator";
import { AuditService } from "./audit.service";
import { AuditEventsQueryDto } from "./dto/audit-events-query.dto";

@ApiTags("audit")
@ApiCookieAuth()
@Controller("audit")
export class AuditController {
    constructor(private readonly audit: AuditService) {}

    @Get("events")
    @RequirePermissions("audit.read")
    public async findAll(@Query() query: AuditEventsQueryDto) {
        const data = await this.audit.findAll(query);
        return { data, message: "Audit events retrieved successfully" };
    }
}
