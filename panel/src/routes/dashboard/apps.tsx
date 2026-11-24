import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, type AppAccess, api, type ZarApp } from "@/api";
import { useConfirm } from "@/components/dialog/confirm";
import { KeyReveal } from "@/components/dialog/key-reveal";
import { AdminOnly } from "./-admin";
import shared from "./-shared.module.scss";

export const Route = createFileRoute("/dashboard/apps")({
    component: () => (
        <AdminOnly>
            <Apps />
        </AdminOnly>
    ),
});

function Apps() {
    const [apps, setApps] = useState<ZarApp[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Key returned by create/regenerate — shown exactly once.
    const [freshKey, setFreshKey] = useState<{
        appName: string;
        key: string;
    } | null>(null);
    const [selected, setSelected] = useState<ZarApp | null>(null);
    const { confirm, element: confirmDialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const list = await api<ZarApp[]>("/apps");
            setApps(list);
            setSelected((current) =>
                current
                    ? (list.find((a) => a.id === current.id) ?? null)
                    : null,
            );
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Failed to load apps",
            );
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    async function act(run: () => Promise<unknown>) {
        setError(null);
        try {
            await run();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Action failed");
        }
    }

    async function regenerateKey(app: ZarApp) {
        const ok = await confirm({
            title: `issue a new key for ${app.name}?`,
            detail: "The current key stops working immediately; the app's backend must be updated with the new one.",
            action: "new key",
            danger: true,
        });
        if (!ok) return;

        await act(async () => {
            const data = await api<{ app: ZarApp; key: string }>(
                `/apps/${app.id}/key`,
                { method: "POST" },
            );
            setFreshKey({ appName: data.app.name, key: data.key });
        });
    }

    async function revokeApp(app: ZarApp) {
        const ok = await confirm({
            title: `revoke ${app.name}?`,
            detail: "Its key stops authenticating and its origin leaves the CORS allow-list. Issuing a new key re-enables it.",
            action: "revoke",
            danger: true,
        });
        if (!ok) return;

        await act(() => api(`/apps/${app.id}/revoke`, { method: "POST" }));
    }

    if (!apps) {
        return error ? (
            <p className={shared.error}>{error}</p>
        ) : (
            <p className={shared.muted}>loading...</p>
        );
    }

    return (
        <>
            {error && <p className={shared.error}>{error}</p>}

            {confirmDialog}

            {freshKey && (
                <KeyReveal
                    appName={freshKey.appName}
                    secret={freshKey.key}
                    onDone={() => setFreshKey(null)}
                />
            )}

            <CreateApp
                onCreated={(appName, key) => {
                    setFreshKey({ appName, key });
                    void load();
                }}
                onError={setError}
            />

            <div className={shared.wrap}>
                <table className={shared.table}>
                    <thead>
                        <tr>
                            <th>name</th>
                            <th>url</th>
                            <th>visibility</th>
                            <th>key</th>
                            <th>grants</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {apps.map((app) => (
                            <tr key={app.id}>
                                <td>{app.name}</td>
                                <td>{app.url ?? "—"}</td>
                                <td>
                                    {app.revokedAt ? (
                                        <span
                                            className={shared.tag}
                                            data-tone="danger"
                                        >
                                            revoked
                                        </span>
                                    ) : app.public ? (
                                        <span
                                            className={shared.tag}
                                            data-tone="accent"
                                        >
                                            public
                                        </span>
                                    ) : (
                                        <span className={shared.tag}>
                                            private
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span
                                        className={shared.tag}
                                        data-tone={
                                            app.confidential
                                                ? "accent"
                                                : undefined
                                        }
                                        title={
                                            app.confidential
                                                ? "server-side: forwarded visitor headers are trusted"
                                                : "shipped to clients: forwarded visitor headers are ignored"
                                        }
                                    >
                                        {app.confidential
                                            ? "server-side"
                                            : "in bundle"}
                                    </span>
                                </td>
                                <td>{app._count?.accesses ?? 0}</td>
                                <td>
                                    <div className={shared.actions}>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            onClick={() =>
                                                setSelected(
                                                    selected?.id === app.id
                                                        ? null
                                                        : app,
                                                )
                                            }
                                        >
                                            {selected?.id === app.id
                                                ? "close"
                                                : "access"}
                                        </button>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            onClick={() =>
                                                act(() =>
                                                    api(`/apps/${app.id}`, {
                                                        method: "PATCH",
                                                        body: JSON.stringify({
                                                            public: !app.public,
                                                        }),
                                                    }),
                                                )
                                            }
                                        >
                                            make{" "}
                                            {app.public ? "private" : "public"}
                                        </button>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            onClick={() =>
                                                act(() =>
                                                    api(`/apps/${app.id}`, {
                                                        method: "PATCH",
                                                        body: JSON.stringify({
                                                            confidential:
                                                                !app.confidential,
                                                        }),
                                                    }),
                                                )
                                            }
                                        >
                                            {app.confidential
                                                ? "key in bundle"
                                                : "key server-side"}
                                        </button>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            onClick={() => regenerateKey(app)}
                                        >
                                            new key
                                        </button>
                                        {!app.revokedAt && (
                                            <button
                                                type="button"
                                                className={shared.action}
                                                data-tone="danger"
                                                onClick={() => revokeApp(app)}
                                            >
                                                revoke
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selected && (
                <AccessPanel
                    app={selected}
                    onChanged={load}
                    onError={setError}
                    confirm={confirm}
                />
            )}
        </>
    );
}

function CreateApp({
    onCreated,
    onError,
}: {
    onCreated: (appName: string, key: string) => void;
    onError: (message: string) => void;
}) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [confidential, setConfidential] = useState(true);
    const [busy, setBusy] = useState(false);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);

        try {
            const data = await api<{ app: ZarApp; key: string }>("/apps", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    url: url || undefined,
                    public: isPublic,
                    confidential,
                }),
            });
            setName("");
            setUrl("");
            setIsPublic(false);
            setConfidential(true);
            onCreated(data.app.name, data.key);
        } catch (err) {
            onError(
                err instanceof ApiError ? err.message : "Failed to create app",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className={shared.inlineForm} onSubmit={onSubmit}>
            <input
                aria-label="app name"
                placeholder="app name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                aria-label="app url"
                placeholder="https://app.url (optional)"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
            <label>
                <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                />{" "}
                public
            </label>
            <label title="The key stays on a server. Required to trust the visitor headers the app forwards.">
                <input
                    type="checkbox"
                    checked={confidential}
                    onChange={(e) => setConfidential(e.target.checked)}
                />{" "}
                server-side key
            </label>
            <button className={shared.action} type="submit" disabled={busy}>
                {busy ? "creating..." : "create app"}
            </button>
        </form>
    );
}

function AccessPanel({
    app,
    onChanged,
    onError,
    confirm,
}: {
    app: ZarApp;
    onChanged: () => Promise<void>;
    onError: (message: string) => void;
    confirm: ReturnType<typeof useConfirm>["confirm"];
}) {
    const [accesses, setAccesses] = useState<AppAccess[] | null>(null);
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setAccesses(await api<AppAccess[]>(`/apps/${app.id}/access`));
        } catch (err) {
            onError(
                err instanceof ApiError
                    ? err.message
                    : "Failed to load access grants",
            );
        }
    }, [app.id, onError]);

    useEffect(() => {
        void load();
    }, [load]);

    async function grant(e: FormEvent) {
        e.preventDefault();
        setBusy(true);

        try {
            await api(`/apps/${app.id}/access`, {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            setEmail("");
            await load();
            await onChanged();
        } catch (err) {
            onError(err instanceof ApiError ? err.message : "Failed to grant");
        } finally {
            setBusy(false);
        }
    }

    async function revoke(access: AppAccess) {
        const ok = await confirm({
            title: `revoke access for ${access.user?.email ?? access.email}?`,
            detail: app.public
                ? "The app is public, so this only matters if it goes private."
                : "They can no longer obtain tokens for this app.",
            action: "revoke",
            danger: true,
        });
        if (!ok) return;

        try {
            await api(`/apps/${app.id}/access/${access.id}`, {
                method: "DELETE",
            });
            await load();
            await onChanged();
        } catch (err) {
            onError(err instanceof ApiError ? err.message : "Failed to revoke");
        }
    }

    return (
        <section className={shared.subsection}>
            <h2>
                access — {app.name}
                {app.public && (
                    <span className={shared.muted}>
                        {" "}
                        (public: grants only matter if it goes private)
                    </span>
                )}
            </h2>

            <form className={shared.inlineForm} onSubmit={grant}>
                <input
                    aria-label="email to grant"
                    placeholder="email to grant"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button className={shared.action} type="submit" disabled={busy}>
                    grant
                </button>
            </form>

            {accesses === null ? (
                <p className={shared.muted}>loading...</p>
            ) : accesses.length === 0 ? (
                <p className={shared.muted}>no grants yet</p>
            ) : (
                <div className={shared.wrap}>
                    <table className={shared.table}>
                        <thead>
                            <tr>
                                <th>who</th>
                                <th>kind</th>
                                <th>granted</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {accesses.map((access) => (
                                <tr key={access.id}>
                                    <td>
                                        {access.user?.email ?? access.email}
                                    </td>
                                    <td>
                                        {access.user ? (
                                            <span
                                                className={shared.tag}
                                                data-tone="accent"
                                            >
                                                user
                                            </span>
                                        ) : (
                                            <span className={shared.tag}>
                                                pending sign-up
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {new Date(
                                            access.createdAt,
                                        ).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className={shared.action}
                                            data-tone="danger"
                                            onClick={() => revoke(access)}
                                        >
                                            revoke
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
