import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { ApiError, api } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";

export const Route = createFileRoute("/recover-password")({
    component: RecoverPassword,
});

function RecoverPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);

        try {
            await api("/auth/recover-password", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            setSent(true);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
            setBusy(false);
        }
    }

    return (
        <AuthView title="recover password">
            {sent ? (
                <p className={form.note}>
                    If an account exists for {email}, a recovery link is on its
                    way. Check your inbox.
                </p>
            ) : (
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

                    {error && <p className={form.error}>{error}</p>}

                    <button
                        className={form.submit}
                        type="submit"
                        disabled={busy}
                    >
                        {busy ? "sending..." : "send recovery link"}
                    </button>
                </form>
            )}
        </AuthView>
    );
}
