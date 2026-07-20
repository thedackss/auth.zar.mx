import { useEffect, useState } from "react";
import { type AuthEvent, api, type Paginated } from "../api";

const EVENT_TYPES = [
    "SIGN_UP",
    "SIGN_IN_SUCCESS",
    "SIGN_IN_FAILURE",
    "SIGN_OUT",
    "SIGN_OUT_ALL",
    "EMAIL_VERIFIED",
    "PASSWORD_SET",
    "PASSWORD_CHANGED",
    "PASSWORD_RECOVER_REQUESTED",
    "ROLE_CHANGED",
    "ACCOUNT_DISABLED",
    "ACCOUNT_ENABLED",
];

export function AuditPage() {
    const [page, setPage] = useState(1);
    const [type, setType] = useState("");
    const [data, setData] = useState<Paginated<AuthEvent> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (type) params.set("type", type);

        api<Paginated<AuthEvent>>(`/audit/events?${params}`)
            .then(setData)
            .catch((err) => setError(err.message));
    }, [page, type]);

    const meta = data?.meta;

    return (
        <>
            <header className="page-head">
                <h2>Audit</h2>
                <select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All events</option>
                    {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </header>
            {error && <p className="error">{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>When</th>
                        <th>Event</th>
                        <th>Email</th>
                        <th>IP</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {data?.items.map((event) => (
                        <tr key={event.id}>
                            <td title={event.createdAt}>
                                {new Date(event.createdAt).toLocaleString()}
                            </td>
                            <td>
                                <code>{event.type}</code>
                            </td>
                            <td>{event.email ?? "—"}</td>
                            <td>{event.ip ?? "—"}</td>
                            <td className="muted">
                                {event.metadata
                                    ? JSON.stringify(event.metadata)
                                    : ""}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {meta && (
                <footer className="pager">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        ← Prev
                    </button>
                    <span className="muted">
                        Page {meta.page} / {Math.max(meta.totalPages, 1)} ·{" "}
                        {meta.total} events
                    </span>
                    <button
                        type="button"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next →
                    </button>
                </footer>
            )}
        </>
    );
}
