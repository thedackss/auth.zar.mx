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
            // The set only needs to outlive its newest session; without an
            // expiry it would grow forever as sessions lapse by TTL.
            .expire(this.userKey(props.userId), env.SESSION_TTL_SECONDS)
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
        // XX: only refresh a session that still exists, so a touch racing a
        // destroy cannot bring the session back.
        await this.redis.client
            .multi()
            .set(
                this.sessionKey(sessionId),
                JSON.stringify(session),
                "EX",
                env.SESSION_TTL_SECONDS,
                "XX",
            )
            .expire(this.userKey(session.userId), env.SESSION_TTL_SECONDS)
            .exec();
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
        const keys = ids.map((id) => this.sessionKey(id));
        // Always drop the set too, even when empty or stale.
        await this.redis.client.del(...keys, this.userKey(userId));
    }
}
