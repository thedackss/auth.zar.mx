import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApiError, api, type OauthClient } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";
import { useAuth } from "@/context/auth";

interface AuthorizeSearch {
    client_id?: string;
    redirect_uri?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    state?: string;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/authorize")({
    validateSearch: (s: Record<string, unknown>): AuthorizeSearch => ({
        client_id: str(s.client_id),
        redirect_uri: str(s.redirect_uri),
        code_challenge: str(s.code_challenge),
        code_challenge_method: str(s.code_challenge_method),
        state: str(s.state),
    }),
    component: Authorize,
});

/**
 * OAuth consent screen (authorization code + PKCE). The request is validated
 * server side before anything is shown; an invalid client or redirect URI
 * ends here with an error and never redirects anywhere.
 */
function Authorize() {
    const search = Route.useSearch();
    const { user, loading } = useAuth();
    const [client, setClient] = useState<OauthClient | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const complete =
        search.client_id &&
        search.redirect_uri &&
        search.code_challenge &&
        search.code_challenge_method === "S256";

    useEffect(() => {
        if (!complete) return;
        const q = new URLSearchParams({
            client_id: search.client_id ?? "",
            redirect_uri: search.redirect_uri ?? "",
        });
        api<OauthClient>(`/app/authorize-check?${q}`)
            .then(setClient)
            .catch((err) =>
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Invalid authorization request",
                ),
            );
    }, [complete, search.client_id, search.redirect_uri]);

    if (!complete) {
        return (
            <AuthView title="authorization">
                <p className={form.error}>
                    Invalid authorization request: client_id, redirect_uri and
                    an S256 code_challenge are required.
                </p>
            </AuthView>
        );
    }

    if (error) {
        return (
            <AuthView title="authorization">
                <p className={form.error}>{error}</p>
            </AuthView>
        );
    }

    if (loading || !client) return null;

    if (!user) {
        // Sign in, then come back here with the same query (rebuilt from the
        // parsed search, not window.location, which may already have moved).
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(search)) if (v) q.set(k, v);
        return (
            <Navigate
                to="/sign-in"
                search={{ redirect: `/authorize?${q}` }}
                replace
            />
        );
    }

    const body = {
        client_id: search.client_id,
        redirect_uri: search.redirect_uri,
        code_challenge: search.code_challenge,
        code_challenge_method: "S256",
        state: search.state,
    };

    async function decide(allow: boolean) {
        setBusy(true);
        setError(null);
        try {
            const { redirectTo } = await api<{ redirectTo: string }>(
                allow ? "/app/authorize" : "/app/authorize/deny",
                { method: "POST", body: JSON.stringify(body) },
            );
            window.location.replace(redirectTo);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong",
            );
            setBusy(false);
        }
    }

    return (
        <AuthView title="authorization">
            <p className={form.hint}>
                <strong>{client.name}</strong> wants to sign you in as{" "}
                <strong>{user.email}</strong>.
                {client.url && (
                    <>
                        {" "}
                        <span style={{ opacity: 0.7 }}>({client.url})</span>
                    </>
                )}
            </p>

            <div className={form.form}>
                <button
                    className={form.submit}
                    type="button"
                    disabled={busy}
                    onClick={() => decide(true)}
                >
                    {busy ? "one moment..." : "continue"}
                </button>
                <button
                    className={form.secondary}
                    type="button"
                    disabled={busy}
                    onClick={() => decide(false)}
                >
                    cancel
                </button>
            </div>
        </AuthView>
    );
}
