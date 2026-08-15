import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ApiError, api } from "@/api";
import form from "@/components/auth-view/form.module.scss";

export const Route = createFileRoute("/dashboard/account")({
    component: Account,
});

function Account() {
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
