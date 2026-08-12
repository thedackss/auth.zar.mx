import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApiError, type AuthEvent, api, type Paginated } from "@/api";
import { AdminOnly } from "./-admin";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/audit")({
    component: () => (
        <AdminOnly>
            <Audit />
        </AdminOnly>
    ),
});

function Audit() {
    const [page, setPage] = useState(1);
    const [events, setEvents] = useState<Paginated<AuthEvent> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api<Paginated<AuthEvent>>(`/audit/events?page=${page}&limit=20`)
            .then(setEvents)
            .catch((err) =>
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Failed to load events",
                ),
            );
    }, [page]);

    if (!events) {
        return error ? (
            <p className={shared.error}>{error}</p>
        ) : (
            <p className={shared.muted}>loading...</p>
        );
    }

    return (
        <>
            {error && <p className={shared.error}>{error}</p>}

            <div className={shared.wrap}>
                <table className={shared.table}>
                    <thead>
                        <tr>
                            <th>when</th>
                            <th>event</th>
                            <th>email</th>
                            <th>ip</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.items.map((ev) => (
                            <tr key={ev.id}>
                                <td>
                                    {new Date(ev.createdAt).toLocaleString()}
                                </td>
                                <td>
                                    <span className={shared.tag}>
                                        {ev.type
                                            .toLowerCase()
                                            .replaceAll("_", " ")}
                                    </span>
                                </td>
                                <td>{ev.email ?? "—"}</td>
                                <td>{ev.ip ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={shared.pager}>
                <button
                    type="button"
                    className={shared.action}
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                >
                    prev
                </button>
                <span>
                    page {events.meta.page} /{" "}
                    {Math.max(events.meta.totalPages, 1)}
                </span>
                <button
                    type="button"
                    className={shared.action}
                    disabled={page >= events.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    next
                </button>
            </div>
        </>
    );
}
