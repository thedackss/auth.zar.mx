import { type FormEvent, useEffect, useState } from "react";
import { type AppSettings, api } from "../api";

export function SettingsPage() {
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [whitelist, setWhitelist] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api<AppSettings>("/settings")
            .then((settings) => {
                setSignupEnabled(settings.signupEnabled);
                setWhitelist(settings.signupWhitelist.join("\n"));
            })
            .catch((err) => setError(err.message));
    }, []);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setStatus(null);
        setError(null);
        try {
            await api("/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    signupEnabled,
                    signupWhitelist: whitelist
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                }),
            });
            setStatus("Saved");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Save failed");
        }
    };

    return (
        <>
            <header className="page-head">
                <h2>Settings</h2>
            </header>
            <form className="card" onSubmit={save}>
                <label className="row">
                    <input
                        type="checkbox"
                        checked={signupEnabled}
                        onChange={(e) => setSignupEnabled(e.target.checked)}
                    />
                    Allow anyone to sign up
                </label>
                <label>
                    Sign-up whitelist (used while sign-up is disabled, one per
                    line: <code>user@dom.tld</code> or <code>*@dom.tld</code>)
                    <textarea
                        rows={6}
                        value={whitelist}
                        onChange={(e) => setWhitelist(e.target.value)}
                        placeholder={"boss@zar.mx\n*@zar.mx"}
                    />
                </label>
                {status && <p className="ok">{status}</p>}
                {error && <p className="error">{error}</p>}
                <button type="submit">Save</button>
            </form>
        </>
    );
}
