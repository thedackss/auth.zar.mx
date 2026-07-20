export interface User {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    emailVerifiedAt: string | null;
    disabledAt: string | null;
    createdAt: string;
}

export interface AppSettings {
    signupEnabled: boolean;
    signupWhitelist: string[];
}

export interface AuthEvent {
    id: string;
    type: string;
    userId: string | null;
    actorId: string | null;
    email: string | null;
    ip: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface Paginated<T> {
    items: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

// The API wraps every response as { data, message }. Cookies ride along
// automatically because panel and API share the origin (via proxy in dev).
// Pass paths without the /api prefix: api("/auth/me").
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`/api${path}`, {
        credentials: "same-origin",
        headers: init?.body ? { "Content-Type": "application/json" } : {},
        ...init,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
        const message = Array.isArray(body?.message)
            ? body.message.join(", ")
            : (body?.message ?? `Request failed (${res.status})`);
        throw new ApiError(res.status, message);
    }

    return body.data as T;
}
