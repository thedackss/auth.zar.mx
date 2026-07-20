import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import Redis from "ioredis";
import { exitWithConnectionError } from "@/common/utils/startup-error";
import { env } from "@/env";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    public client: Redis;

    public async onModuleInit() {
        this.client = new Redis(env.REDIS_URL, { lazyConnect: true });

        try {
            await this.client.connect();
        } catch (error) {
            exitWithConnectionError("Redis", env.REDIS_URL, error);
        }

        // Attached after the initial connect so pre-connect retries don't
        // spam the log; from here on, errors mean a lost connection.
        this.client.on("error", (error) =>
            this.logger.error("Redis error:", error),
        );

        this.logger.log("Redis connection successful");
    }

    public async onModuleDestroy() {
        await this.client.quit();
    }
}
