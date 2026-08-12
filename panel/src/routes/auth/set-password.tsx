import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ApiError, api } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";

// This path is baked into the set-password links the API emails out.
export const Route = createFileRoute("/auth/set-password")({
    validateSearch: (search): { token?: string } => ({
        token:
            typeof search.token === "string" && search.token
                ? search.token
                : undefined,
    }),
    component: SetPassword,
});

function SetPassword() {
    const { token } = Route.useSearch();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();

        if (password !== confirm) {
            setError("Passwords don't match");
            return;
        }

        setBusy(true);
        setError(null);

        try {
            await api("/auth/set-password", {
                method: "POST",
                body: JSON.stringify({ token, password }),
            });
            setDone(true);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
            setBusy(false);
        }
    }

    if (!token) {
        return (
            <AuthView title="set password">
                <p className={form.error}>
                    This link is missing its token. Open the link from your
                    email again, or request a new one.
                </p>
                <p className={form.aside}>
                    <Link to="/recover-password">recover password</Link>
                </p>
            </AuthView>
        );
    }

    if (done) {
        return (
            <AuthView title="set password">
                <p className={form.note}>Password set. You can sign in now.</p>
                <p className={form.aside}>
                    <Link to="/sign-in">sign in</Link>
                </p>
            </AuthView>
        );
    }

    return (
        <AuthView title="set password">
            <form className={form.form} onSubmit={onSubmit}>
                <div className={form.field}>
                    <label htmlFor="password">new password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className={form.field}>
                    <label htmlFor="confirm">confirm password</label>
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

                <button className={form.submit} type="submit" disabled={busy}>
                    {busy ? "saving..." : "set password"}
                </button>
            </form>
        </AuthView>
    );
}
