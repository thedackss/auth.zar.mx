import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, type User } from "./api";
import { Layout } from "./components/Layout";
import { AuditPage } from "./pages/AuditPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SignInPage } from "./pages/SignInPage";
import { UsersPage } from "./pages/UsersPage";

export default function App() {
    const [me, setMe] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api<User>("/auth/me")
            .then(setMe)
            .catch(() => setMe(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <main className="center">Loading…</main>;

    if (!me) return <SignInPage onSignedIn={setMe} />;

    return (
        <Routes>
            <Route element={<Layout me={me} onSignedOut={() => setMe(null)} />}>
                <Route index element={<UsersPage me={me} />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}
