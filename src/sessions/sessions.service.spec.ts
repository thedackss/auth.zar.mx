import type { RedisService } from "@/redis/redis.service";
import { SessionsService } from "./sessions.service";

jest.mock("@/env", () => ({ env: { SESSION_TTL_SECONDS: 600 } }));

// Minimal ioredis stand-in: a Map store plus a chainable multi().
function fakeRedis() {
    const store = new Map<string, string>();
    const sets = new Map<string, Set<string>>();
    const ttl = new Map<string, number>();
    const ops: string[] = [];

    const commands = {
        setex: async (k: string, t: number, v: string) => {
            ops.push(`setex ${k}`);
            store.set(k, v);
            ttl.set(k, t);
        },
        set: async (
            k: string,
            v: string,
            _ex: string,
            t: number,
            mode?: string,
        ) => {
            ops.push(`set ${k} ${mode ?? ""}`.trim());
            if (mode === "XX" && !store.has(k)) return null;
            store.set(k, v);
            ttl.set(k, t);
            return "OK";
        },
        get: async (k: string) => store.get(k) ?? null,
        del: async (...keys: string[]) => {
            ops.push(`del ${keys.join(",")}`);
            for (const k of keys) {
                store.delete(k);
                sets.delete(k);
            }
        },
        sadd: async (k: string, m: string) => {
            ops.push(`sadd ${k}`);
            if (!sets.has(k)) sets.set(k, new Set());
            sets.get(k)?.add(m);
        },
        srem: async (k: string, m: string) => {
            sets.get(k)?.delete(m);
        },
        smembers: async (k: string) => [...(sets.get(k) ?? [])],
        expire: async (k: string, t: number) => {
            ops.push(`expire ${k}`);
            ttl.set(k, t);
        },
    };

    const multi = () => {
        const queue: (() => Promise<unknown>)[] = [];
        const chain: Record<string, unknown> = {
            exec: async () => {
                const out: [null, unknown][] = [];
                for (const fn of queue) out.push([null, await fn()]);
                return out;
            },
        };
        for (const [name, fn] of Object.entries(commands)) {
            chain[name] = (...args: unknown[]) => {
                queue.push(() =>
                    (fn as (...a: unknown[]) => Promise<unknown>)(...args),
                );
                return chain;
            };
        }
        return chain;
    };

    return { client: { ...commands, multi }, store, sets, ttl, ops };
}

describe("SessionsService", () => {
    let redis: ReturnType<typeof fakeRedis>;
    let service: SessionsService;

    beforeEach(() => {
        redis = fakeRedis();
        service = new SessionsService(redis as unknown as RedisService);
    });

    it("creates a session and tracks it in an expiring per-user set", async () => {
        const id = await service.create({ userId: "u1" });

        expect(await service.find(id)).toMatchObject({ userId: "u1" });
        expect(redis.sets.get("user-sessions:u1")).toEqual(new Set([id]));
        expect(redis.ttl.get("user-sessions:u1")).toBe(600);
        expect(redis.ttl.get(`session:${id}`)).toBe(600);
    });

    it("touch refreshes an existing session and the user set", async () => {
        const id = await service.create({ userId: "u1" });
        const session = await service.find(id);
        if (!session) throw new Error("session missing");
        redis.ttl.clear();

        await service.touch(id, session);

        expect(redis.ttl.get(`session:${id}`)).toBe(600);
        expect(redis.ttl.get("user-sessions:u1")).toBe(600);
    });

    it("touch never recreates a destroyed session", async () => {
        const id = await service.create({ userId: "u1" });
        const session = await service.find(id);
        if (!session) throw new Error("session missing");

        await service.destroy(id);
        await service.touch(id, session);

        expect(await service.find(id)).toBeNull();
        expect(redis.ops).toContain(`set session:${id} XX`);
    });

    it("destroy removes the session and its set membership", async () => {
        const a = await service.create({ userId: "u1" });
        const b = await service.create({ userId: "u1" });

        await service.destroy(a);

        expect(await service.find(a)).toBeNull();
        expect(await service.find(b)).not.toBeNull();
        expect(redis.sets.get("user-sessions:u1")).toEqual(new Set([b]));
    });

    it("destroyAll drops every session and the set, even when empty", async () => {
        const a = await service.create({ userId: "u1" });
        const b = await service.create({ userId: "u1" });
        const other = await service.create({ userId: "u2" });

        await service.destroyAll("u1");
        expect(await service.find(a)).toBeNull();
        expect(await service.find(b)).toBeNull();
        expect(redis.sets.has("user-sessions:u1")).toBe(false);
        expect(await service.find(other)).not.toBeNull();

        await expect(service.destroyAll("nobody")).resolves.toBeUndefined();
    });
});
