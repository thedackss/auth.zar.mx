import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ApiError, api, type User } from "@/api";
import { useConfirm } from "@/components/dialog/confirm";
import { useAuth } from "@/context/auth";
import { AdminOnly } from "./-admin";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/users")({
    component: () => (
        <AdminOnly>
            <Users />
        </AdminOnly>
    ),
});

function Users() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<User[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const { confirm, element: confirmDialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            setUsers(await api<User[]>("/users"));
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Failed to load users",
            );
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function act(id: string, run: () => Promise<unknown>) {
        setBusyId(id);
        setError(null);
        try {
            await run();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Action failed");
        } finally {
            setBusyId(null);
        }
    }

    async function toggleDisabled(u: User) {
        if (u.disabledAt) {
            await act(u.id, () =>
                api(`/users/${u.id}/enable`, { method: "POST" }),
            );
            return;
        }

        const ok = await confirm({
            title: `disable ${u.email}?`,
            detail: "They are signed out everywhere and cannot sign in until re-enabled.",
            action: "disable",
            danger: true,
        });
        if (!ok) return;

        await act(u.id, () =>
            api(`/users/${u.id}/disable`, { method: "POST" }),
        );
    }

    async function toggleRole(u: User) {
        const role = u.role === "ADMIN" ? "USER" : "ADMIN";
        const ok = await confirm({
            title: `${role === "ADMIN" ? "promote" : "demote"} ${u.email}?`,
            detail:
                role === "ADMIN"
                    ? "Admins manage users, apps, settings and the audit log on auth.zar.mx."
                    : "They lose access to this panel and its admin API.",
            action: role === "ADMIN" ? "promote" : "demote",
            danger: role === "ADMIN",
        });
        if (!ok) return;

        await act(u.id, () =>
            api(`/users/${u.id}/role`, {
                method: "PATCH",
                body: JSON.stringify({ role }),
            }),
        );
    }

    if (!users) {
        return error ? (
            <p className={shared.error}>{error}</p>
        ) : (
            <p className={shared.muted}>loading...</p>
        );
    }

    return (
        <>
            {error && <p className={shared.error}>{error}</p>}
            {confirmDialog}

            <div className={shared.wrap}>
                <table className={shared.table}>
                    <thead>
                        <tr>
                            <th>email</th>
                            <th>role</th>
                            <th>status</th>
                            <th>created</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => {
                            const self = u.id === me?.id;
                            const busy = busyId === u.id;

                            return (
                                <tr key={u.id}>
                                    <td>
                                        {u.email}
                                        {self && (
                                            <span className={shared.muted}>
                                                {" "}
                                                (you)
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <span
                                            className={shared.tag}
                                            data-tone={
                                                u.role === "ADMIN"
                                                    ? "accent"
                                                    : undefined
                                            }
                                        >
                                            {u.role.toLowerCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {u.disabledAt ? (
                                            <span
                                                className={shared.tag}
                                                data-tone="danger"
                                            >
                                                disabled
                                            </span>
                                        ) : u.emailVerifiedAt ? (
                                            <span className={shared.tag}>
                                                verified
                                            </span>
                                        ) : (
                                            <span className={shared.tag}>
                                                unverified
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {new Date(
                                            u.createdAt,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className={shared.actions}>
                                            <button
                                                type="button"
                                                className={shared.action}
                                                disabled={self || busy}
                                                onClick={() => toggleRole(u)}
                                            >
                                                {u.role === "ADMIN"
                                                    ? "demote"
                                                    : "promote"}
                                            </button>
                                            <button
                                                type="button"
                                                className={shared.action}
                                                disabled={self || busy}
                                                data-tone={
                                                    u.disabledAt
                                                        ? undefined
                                                        : "danger"
                                                }
                                                onClick={() =>
                                                    toggleDisabled(u)
                                                }
                                            >
                                                {u.disabledAt
                                                    ? "enable"
                                                    : "disable"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
