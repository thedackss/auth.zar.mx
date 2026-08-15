import {
    createFileRoute,
    Link,
    Navigate,
    Outlet,
    useNavigate,
} from "@tanstack/react-router";
import { useAuth } from "@/context/auth";
import styles from "./route.module.scss";

export const Route = createFileRoute("/dashboard")({
    component: DashboardLayout,
});

function DashboardLayout() {
    const { user, loading, signOut } = useAuth();
    const navigate = useNavigate();

    if (loading) return null;
    if (!user) return <Navigate to="/sign-in" replace />;

    async function onSignOut() {
        await signOut();
        navigate({ to: "/", replace: true });
    }

    return (
        <div className={styles.dashboard}>
            <header>
                <Link className={styles.home} to="/">
                    Zar Auth<span>_</span>
                </Link>

                <nav>
                    {user.role === "ADMIN" && (
                        <>
                            <Link
                                to="/dashboard/users"
                                activeProps={{ "data-active": true }}
                            >
                                users
                            </Link>
                            <Link
                                to="/dashboard/apps"
                                activeProps={{ "data-active": true }}
                            >
                                apps
                            </Link>
                            <Link
                                to="/dashboard/settings"
                                activeProps={{ "data-active": true }}
                            >
                                settings
                            </Link>
                            <Link
                                to="/dashboard/audit"
                                activeProps={{ "data-active": true }}
                            >
                                audit
                            </Link>
                            {/* Bull Board is served by the backend, outside
                                the SPA, so a plain anchor. */}
                            <a href="/bullmq">bullmq</a>
                        </>
                    )}
                    <Link
                        to="/dashboard/account"
                        activeProps={{ "data-active": true }}
                    >
                        account
                    </Link>
                </nav>

                <div className={styles.session}>
                    <span>{user.email}</span>
                    <button type="button" onClick={onSignOut}>
                        sign out
                    </button>
                </div>
            </header>

            <section className={styles.content}>
                <Outlet />
            </section>
        </div>
    );
}
