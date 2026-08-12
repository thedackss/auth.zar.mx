import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ApiError, api } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/sign-in")({
    component: SignIn,
});

function SignIn() {
    const navigate = useNavigate();
    const { refresh } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);

        try {
            await api("/auth/sign-in", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            await refresh();
            navigate({ to: "/dashboard", replace: true });
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
            setBusy(false);
        }
    }

    return (
        <AuthView title="sign in">
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
