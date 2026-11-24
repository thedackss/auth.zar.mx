import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useState } from "react";
import { ApiError, api, type ContactMessage, type Paginated } from "@/api";
import { AdminOnly } from "./-admin";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/messages")({
    component: () => (
        <AdminOnly>
            <Messages />
        </AdminOnly>
    ),
});

function Messages() {
    const [page, setPage] = useState(1);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [data, setData] = useState<Paginated<ContactMessage> | null>(null);
    const [open, setOpen] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setData(
                await api<Paginated<ContactMessage>>(
                    `/contact?page=${page}&limit=20&unread=${unreadOnly}`,
                ),
            );
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to load messages",
            );
        }
    }, [page, unreadOnly]);

    useEffect(() => {
        void load();
    }, [load]);

    async function toggle(m: ContactMessage) {
        const next = open === m.id ? null : m.id;
        setOpen(next);
        // Opening an unread message marks it read; nothing to undo on close.
        if (next && !m.readAt) await setRead(m, true);
    }

    async function setRead(m: ContactMessage, read: boolean) {
        setError(null);
        try {
            await api(`/contact/${m.id}/${read ? "read" : "unread"}`, {
                method: "POST",
            });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Action failed");
        }
    }

    if (!data) {
        return error ? (
            <p className={shared.error}>{error}</p>
        ) : (
            <p className={shared.muted}>loading...</p>
        );
    }

    return (
        <>
            {error && <p className={shared.error}>{error}</p>}

            <div className={shared.inlineForm}>
                <label>
                    <input
                        type="checkbox"
                        checked={unreadOnly}
                        onChange={(e) => {
                            setPage(1);
                            setUnreadOnly(e.target.checked);
                        }}
                    />{" "}
                    unread only
                </label>
            </div>

            {data.items.length === 0 ? (
                <p className={shared.muted}>no messages</p>
            ) : (
                <div className={shared.wrap}>
                    <table className={shared.table}>
                        <thead>
                            <tr>
                                <th>when</th>
                                <th>from</th>
                                <th>via</th>
                                <th>message</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((m) => (
                                <Fragment key={m.id}>
                                    <tr
                                        className={
                                            m.readAt ? undefined : shared.unread
                                        }
                                    >
                                        <td>
                                            {new Date(
                                                m.createdAt,
                                            ).toLocaleString()}
                                        </td>
                                        <td>
                                            {m.name}{" "}
                                            <span className={shared.muted}>
                                                &lt;{m.email}&gt;
                                            </span>
                                        </td>
                                        <td>
                                            <span className={shared.tag}>
                                                {m.appName}
                                            </span>
                                        </td>
                                        <td
                                            style={{
                                                maxWidth: "24rem",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {m.message}
                                        </td>
                                        <td>
                                            <div className={shared.actions}>
                                                <button
                                                    type="button"
                                                    className={shared.action}
                                                    onClick={() => toggle(m)}
                                                >
                                                    {open === m.id
                                                        ? "close"
                                                        : "open"}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={shared.action}
                                                    onClick={() =>
                                                        setRead(m, !m.readAt)
                                                    }
                                                >
                                                    {m.readAt
                                                        ? "mark unread"
                                                        : "mark read"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {open === m.id && (
                                        <tr>
                                            <td colSpan={5}>
                                                <p className={shared.message}>
                                                    {m.message}
                                                </p>
                                                <p className={shared.muted}>
                                                    reply:{" "}
                                                    <a
                                                        href={`mailto:${m.email}`}
                                                    >
                                                        {m.email}
                                                    </a>
                                                    {m.ip && ` · ip ${m.ip}`}
                                                    {m.locale &&
                                                        ` · ${m.locale}`}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                    page {data.meta.page} / {Math.max(data.meta.totalPages, 1)}
                </span>
                <button
                    type="button"
                    className={shared.action}
                    disabled={page >= data.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                >
                    next
                </button>
            </div>
        </>
    );
}
