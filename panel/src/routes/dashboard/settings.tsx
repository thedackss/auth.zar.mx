import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { api, ApiError, type AppSettings } from "@/api";
import form from "@/components/auth-view/form.module.scss";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/settings")({
    component: Settings,
});

function Settings() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [whitelist, setWhitelist] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api<AppSettings>("/settings")
            .then((s) => {
                setSettings(s);
                setWhitelist(s.signupWhitelist.join("\n"));
            })
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

        const entries = whitelist
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        try {
            const next = await api<AppSettings>("/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    signupEnabled: settings.signupEnabled,
                    signupWhitelist: entries,
                }),
            });
            setSettings(next);
            setWhitelist(next.signupWhitelist.join("\n"));
            setSaved(true);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Failed to save",
            );
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
        <form className={form.form} onSubmit={onSubmit} style={{ maxWidth: "28rem" }}>
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
            </div>

            <div className={form.field}>
                <label htmlFor="whitelist">
                    sign-up whitelist (one per line, email or *@domain)
                </label>
                <textarea
                    id="whitelist"
                    rows={6}
                    value={whitelist}
                    onChange={(e) => setWhitelist(e.target.value)}
                />
            </div>

            {error && <p className={form.error}>{error}</p>}
            {saved && <p className={form.note}>Saved.</p>}

            <button className={form.submit} type="submit" disabled={busy}>
                {busy ? "saving..." : "save settings"}
            </button>
        </form>
    );
}
