import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/api";
import AuthView from "@/components/auth-view";
import form from "@/components/auth-view/form.module.scss";

// This path is baked into the verification links the API emails out.
export const Route = createFileRoute("/auth/verify-email")({
    validateSearch: (search): { token?: string } => ({
        token:
            typeof search.token === "string" && search.token
                ? search.token
                : undefined,
    }),
    component: VerifyEmail,
});

type Status =
    | { state: "verifying" }
    | { state: "done" }
    | { state: "error"; message: string };

function VerifyEmail() {
    const { token } = Route.useSearch();

    const [status, setStatus] = useState<Status>(
        token
            ? { state: "verifying" }
            : { state: "error", message: "This link is missing its token." },
    );

    useEffect(() => {
        if (!token) return;

        api(`/auth/verify-email?token=${encodeURIComponent(token)}`)
            .then(() => setStatus({ state: "done" }))
            .catch((err) =>
                setStatus({
                    state: "error",
                    message:
                        err instanceof ApiError
                            ? err.message
                            : "Something went wrong",
                }),
            );
    }, [token]);

    return (
        <AuthView title="verify email">
            {status.state === "verifying" && (
                <p className={form.note}>verifying...</p>
            )}

            {status.state === "done" && (
                <>
                    <p className={form.note}>Email verified.</p>
                    <p className={form.aside}>
                        <Link to="/sign-in">sign in</Link>
                    </p>
                </>
            )}

            {status.state === "error" && (
                <p className={form.error}>{status.message}</p>
            )}
        </AuthView>
    );
}
