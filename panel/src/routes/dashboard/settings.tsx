import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { ApiError, type AppSettings, api } from "@/api";
import form from "@/components/auth-view/form.module.scss";
import { AdminOnly } from "./-admin";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/settings")({
    component: () => (
        <AdminOnly>
            <Settings />
        </AdminOnly>
    ),
});

function Settings() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api<AppSettings>("/settings")
            .then(setSettings)
            .catch((err) =>
                setError(
                    err instanceof ApiError
                        ? err.message
                        : "Failed to load settings",
                ),
            );
    }, []);

    async function onSubmit(e: FormEvent) {
        if (!settings) return;
        e.preventDefault();
        setBusy(true);
        setError(null);
        setSaved(false);

        try {
            const next = await api<AppSettings>("/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    signupEnabled: settings.signupEnabled,
                }),
            });
            setSettings(next);
            setSaved(true);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to save");
        } finally {
            setBusy(false);
        }
    }

    if (!settings) {
        return error ? (
            <p className={shared.error}>{error}</p>
        ) : (
            <p className={shared.muted}>loading...</p>
        );
    }

    return (
        <form
            className={form.form}
            onSubmit={onSubmit}
            style={{ maxWidth: "28rem" }}
        >
            <div className={form.field}>
                <label htmlFor="signup">
                    <input
                        id="signup"
                        type="checkbox"
                        checked={settings.signupEnabled}
                        onChange={(e) =>
                            setSettings({
                                ...settings,
                                signupEnabled: e.target.checked,
                            })
                        }
                    />{" "}
                    open sign-up enabled
                </label>
                <p className={form.note}>
                    Direct sign-up on auth.zar.mx only — app sign-up is governed
                    per app in the apps tab.
                </p>
            </div>

            {error && <p className={form.error}>{error}</p>}
            {saved && <p className={form.note}>Saved.</p>}

            <button className={form.submit} type="submit" disabled={busy}>
                {busy ? "saving..." : "save settings"}
            </button>
        </form>
    );
}
