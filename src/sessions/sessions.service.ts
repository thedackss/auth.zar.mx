import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { env } from "@/env";
import { RedisService } from "@/redis/redis.service";
import { CreateSessionProps } from "./interfaces/create.interface";
import { SessionData } from "./interfaces/session.interface";

@Injectable()
export class SessionsService {
    constructor(private readonly redis: RedisService) {}

    private sessionKey(sessionId: string): string {
        return `session:${sessionId}`;
    }

    private userKey(userId: string): string {
        return `user-sessions:${userId}`;
    }

    private generateId(): string {
        return randomBytes(32).toString("base64url");
    }

    public async create(props: CreateSessionProps): Promise<string> {
        const id = this.generateId();
        const now = Date.now();
        const session: SessionData = {
            userId: props.userId,
            createdAt: now,
            lastSeenAt: now,
        };

        await this.redis.client
            .multi()
            .setex(
                this.sessionKey(id),
                env.SESSION_TTL_SECONDS,
                JSON.stringify(session),
            )
            .sadd(this.userKey(props.userId), id)
            .exec();

        return id;
    }

    public async find(sessionId: string): Promise<SessionData | null> {
        const raw = await this.redis.client.get(this.sessionKey(sessionId));
        if (!raw) return null;
        return JSON.parse(raw) as SessionData;
    }

    public async touch(sessionId: string, session: SessionData): Promise<void> {
        session.lastSeenAt = Date.now();
        await this.redis.client.setex(
            this.sessionKey(sessionId),
            env.SESSION_TTL_SECONDS,
            JSON.stringify(session),
        );
    }

    public async destroy(sessionId: string): Promise<void> {
        const session = await this.find(sessionId);
        await this.redis.client.del(this.sessionKey(sessionId));
        if (session) {
            await this.redis.client.srem(
                this.userKey(session.userId),
                sessionId,
            );
        }
    }

    public async destroyAll(userId: string): Promise<void> {
        const ids = await this.redis.client.smembers(this.userKey(userId));
        if (ids.length === 0) return;
        const keys = ids.map((id) => this.sessionKey(id));
        await this.redis.client
            .multi()
            .del(...keys)
            .del(this.userKey(userId))
            .exec();
    }
}
