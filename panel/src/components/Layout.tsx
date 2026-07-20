import { NavLink, Outlet } from "react-router-dom";
import { api, type User } from "../api";

export function Layout({
    me,
    onSignedOut,
}: {
    me: User;
    onSignedOut: () => void;
}) {
    const signOut = async () => {
        await api("/auth/sign-out", { method: "POST" }).catch(() => null);
        onSignedOut();
    };

    return (
        <div className="shell">
            <aside>
                <h1>zar auth</h1>
                <nav>
                    <NavLink to="/" end>
                        Users
                    </NavLink>
                    <NavLink to="/settings">Settings</NavLink>
                    <NavLink to="/audit">Audit</NavLink>
                </nav>
                <footer>
                    <span title={me.role}>{me.email}</span>
                    <button type="button" onClick={signOut}>
                        Sign out
                    </button>
                </footer>
            </aside>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
