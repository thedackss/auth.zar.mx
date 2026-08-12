import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { api, type User } from "@/api";

interface AuthState {
    user: User | null;
    loading: boolean;
    refresh: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            setUser(await api<User>("/auth/me"));
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        try {
            await api("/auth/sign-out", { method: "POST" });
        } catch {
            // Session may already be gone; treat as signed out either way.
        }
        setUser(null);
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({ user, loading, refresh, signOut }),
        [user, loading, refresh, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
