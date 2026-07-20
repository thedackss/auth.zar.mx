import { useCallback, useEffect, useState } from "react";
import { api, type User } from "../api";

export function UsersPage({ me }: { me: User }) {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        api<User[]>("/users")
            .then(setUsers)
            .catch((err) => setError(err.message));
    }, []);

    useEffect(load, [load]);

    const act = async (fn: () => Promise<unknown>) => {
        setError(null);
        try {
            await fn();
            load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Action failed");
        }
    };

    const setRole = (user: User, role: User["role"]) =>
        act(() =>
            api(`/users/${user.id}/role`, {
                method: "PATCH",
                body: JSON.stringify({ role }),
            }),
        );

    const toggleDisabled = (user: User) =>
        act(() =>
            api(`/users/${user.id}/${user.disabledAt ? "enable" : "disable"}`, {
                method: "POST",
            }),
        );

    return (
        <>
            <header className="page-head">
                <h2>Users</h2>
                <span className="muted">{users.length} total</span>
            </header>
            {error && <p className="error">{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Verified</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => {
                        const self = user.id === me.id;
                        return (
                            <tr
                                key={user.id}
                                className={user.disabledAt ? "dim" : ""}
                            >
                                <td>
                                    {user.email}
                                    {self && <em className="muted"> (you)</em>}
                                </td>
                                <td>
                                    <select
                                        value={user.role}
                                        disabled={self}
                                        onChange={(e) =>
                                            setRole(
                                                user,
                                                e.target.value as User["role"],
                                            )
                                        }
                                    >
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </td>
                                <td>{user.emailVerifiedAt ? "✓" : "—"}</td>
                                <td>
                                    {user.disabledAt ? "Disabled" : "Active"}
                                </td>
                                <td>
                                    {new Date(
                                        user.createdAt,
                                    ).toLocaleDateString()}
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        disabled={self}
                                        onClick={() => toggleDisabled(user)}
                                    >
                                        {user.disabledAt ? "Enable" : "Disable"}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </>
    );
}
