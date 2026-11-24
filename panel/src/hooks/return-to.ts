import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { api } from "@/api";

export interface ReturnSearch {
    /** Where a downstream app wants the user sent after sign-in. */
    redirect?: string;
}

export const validateReturnSearch = (
    search: Record<string, unknown>,
): ReturnSearch => ({
    redirect:
        typeof search.redirect === "string" && search.redirect
            ? search.redirect
            : undefined,
});

/** Host shown in "you will be sent back to ..." hints; null if unparseable. */
export function redirectHost(redirect: string | undefined): string | null {
    if (!redirect) return null;
    try {
        return new URL(redirect).host;
    } catch {
        return null;
    }
}

/**
 * Leaves the panel for `redirect` when the API confirms it belongs to a
 * registered app; otherwise lands on the dashboard. The check lives server
 * side so the panel never has to know the app list.
 */
export function useReturnTo(redirect: string | undefined) {
    const navigate = useNavigate();

    return useCallback(async () => {
        if (redirect) {
            const { allowed } = await api<{ allowed: boolean }>(
                `/app/redirect-check?url=${encodeURIComponent(redirect)}`,
            ).catch(() => ({ allowed: false }));

            if (allowed) {
                window.location.replace(redirect);
                return;
            }
        }

        navigate({ to: "/dashboard", replace: true });
    }, [redirect, navigate]);
}
