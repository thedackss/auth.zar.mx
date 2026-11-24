import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, type AppSession, api } from "@/api";
import form from "@/components/auth-view/form.module.scss";
import { useConfirm } from "@/components/dialog/confirm";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/account")({
    component: Account,
});

function Account() {
    return (
        <>
            <ChangePassword />
            <AppSessions />
        </>
    );
}

/** Apps and devices signed in through the OAuth (PKCE) flow. */
function AppSessions() {
    const [sessions, setSessions] = useState<AppSession[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { confirm, element: confirmDialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            setSessions(await api<AppSession[]>("/app/oauth/sessions"));
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to load app sessions",
            );
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function revoke(s: AppSession) {
        const ok = await confirm({
            title: `sign out ${s.app.name}${s.deviceName ? ` on ${s.deviceName}` : ""}?`,
            detail: "The app will have to sign in again on that device.",
            action: "sign out",
            danger: true,
        });
        if (!ok) return;

        setError(null);
        try {
            await api(`/app/oauth/sessions/${s.familyId}`, {
                method: "DELETE",
            });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Action failed");
        }
    }

    return (
        <section className={shared.subsection}>
            <h2>signed-in apps</h2>
            {confirmDialog}
            {error && <p className={shared.error}>{error}</p>}

            {sessions === null ? (
                <p className={shared.muted}>loading...</p>
            ) : sessions.length === 0 ? (
                <p className={shared.muted}>
                    no apps are signed in with your account
                </p>
            ) : (
                <div className={shared.wrap}>
                    <table className={shared.table}>
                        <thead>
                            <tr>
                                <th>app</th>
                                <th>device</th>
                                <th>since</th>
                                <th>last used</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr key={s.familyId}>
                                    <td>{s.app.name}</td>
                                    <td>{s.deviceName ?? "—"}</td>
                                    <td>
                                        {new Date(
                                            s.createdAt,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {s.lastUsedAt
                                            ? new Date(
                                                  s.lastUsedAt,
                                              ).toLocaleString()
                                            : "—"}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            data-tone="danger"
                                            onClick={() => revoke(s)}
                                        >
                                            sign out
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function ChangePassword() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (next !== confirm) {
            setError("Passwords don't match");
            return;
        }

        setBusy(true);
        setError(null);
        setDone(false);

        try {
            await api("/change-password", {
                method: "POST",
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: next,
                }),
            });
            setCurrent("");
            setNext("");
            setConfirm("");
            setDone(true);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <form
            className={form.form}
            onSubmit={onSubmit}
            style={{ maxWidth: "20rem" }}
        >
            <div className={form.field}>
                <label htmlFor="current">current password</label>
                <input
                    id="current"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                />
            </div>

            <div className={form.field}>
                <label htmlFor="new">new password</label>
                <input
                    id="new"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                />
            </div>

            <div className={form.field}>
                <label htmlFor="confirm">confirm new password</label>
                <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />
            </div>

            {error && <p className={form.error}>{error}</p>}
            {done && (
                <p className={form.note}>
                    Password changed. Your other sessions were signed out.
                </p>
            )}

            <button className={form.submit} type="submit" disabled={busy}>
                {busy ? "changing..." : "change password"}
            </button>
        </form>
    );
}
