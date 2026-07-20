import { type FormEvent, useState } from "react";
import { api, type User } from "../api";

export function SignInPage({
    onSignedIn,
}: {
    onSignedIn: (user: User) => void;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const user = await api<User>("/auth/sign-in", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });
            onSignedIn(user);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="center">
            <form className="card signin" onSubmit={submit}>
                <h1>zar auth</h1>
                <p className="muted">Admin panel</p>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        required
                    />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </main>
    );
}
