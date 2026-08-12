import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type User } from "@/api";
import { useAuth } from "@/context/auth";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/users")({
    component: Users,
});

function Users() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<User[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

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
            setError(
                err instanceof ApiError ? err.message : "Action failed",
            );
        } finally {
            setBusyId(null);
        }
    }

    function toggleDisabled(u: User) {
        const verb = u.disabledAt ? "enable" : "disable";
        void act(u.id, () => api(`/users/${u.id}/${verb}`, { method: "POST" }));
    }

    function toggleRole(u: User) {
        const role = u.role === "ADMIN" ? "USER" : "ADMIN";
        void act(u.id, () =>
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
