import {
    Controller,
    Get,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "@/prisma/prisma.service";
import { RedisService } from "@/redis/redis.service";

type CheckResult = "ok" | "down";

@ApiTags("health")
@Controller("health")
@SkipThrottle()
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}

    @Get()
    public async check() {
        const [db, redis] = await Promise.all([
            this.checkDb(),
            this.checkRedis(),
        ]);

        const ok = db === "ok" && redis === "ok";
        const payload = {
            status: ok ? "ok" : "down",
            checks: { db, redis },
        };

        if (!ok) throw new ServiceUnavailableException(payload);
        return payload;
    }

    private async checkDb(): Promise<CheckResult> {
        try {
            await this.prisma.client.$queryRaw`SELECT 1`;
            return "ok";
        } catch (error) {
            this.logger.error({ err: error }, "DB health check failed");
            return "down";
        }
    }

    private async checkRedis(): Promise<CheckResult> {
        try {
            const reply = await this.redis.client.ping();
            return reply === "PONG" ? "ok" : "down";
        } catch (error) {
            this.logger.error({ err: error }, "Redis health check failed");
            return "down";
        }
    }
}
