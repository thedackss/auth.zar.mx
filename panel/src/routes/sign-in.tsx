import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, api } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";
import { useAuth } from "@/context/auth";
import {
    redirectHost,
    useReturnTo,
    validateReturnSearch,
} from "@/hooks/return-to";

export const Route = createFileRoute("/sign-in")({
    validateSearch: validateReturnSearch,
    component: SignIn,
});

function SignIn() {
    const { redirect } = Route.useSearch();
    const returnTo = useReturnTo(redirect);
    const { user, loading, refresh } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Already signed in (e.g. an app sent the user here): go straight back.
    useEffect(() => {
        if (!loading && user) void returnTo();
    }, [loading, user, returnTo]);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);

        try {
            await api("/sign-in", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            await refresh();
            await returnTo();
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
            setBusy(false);
        }
    }

    return (
        <AuthView title="sign in">
            {redirectHost(redirect) && (
                <p className={form.hint}>
                    you will be sent back to{" "}
                    <strong>{redirectHost(redirect)}</strong>
                </p>
            )}

            <form className={form.form} onSubmit={onSubmit}>
                <div className={form.field}>
                    <label htmlFor="email">email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className={form.field}>
                    <label htmlFor="password">password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                {error && <p className={form.error}>{error}</p>}

                <button className={form.submit} type="submit" disabled={busy}>
                    {busy ? "signing in..." : "sign in"}
                </button>
            </form>

            <p className={form.aside}>
                <Link to="/recover-password">forgot password?</Link>
            </p>
        </AuthView>
    );
}
