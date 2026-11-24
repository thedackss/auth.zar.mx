import { Link, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useReturnTo } from "@/hooks/return-to";
import styles from "./index.module.scss";

export default function Landing() {
    const { user, loading } = useAuth();
    const { redirect } = useSearch({ from: "/" });
    const returnTo = useReturnTo(redirect);

    // An app sent an already signed-in user here: bounce them straight back.
    useEffect(() => {
        if (redirect && !loading && user) void returnTo();
    }, [redirect, loading, user, returnTo]);

    return (
        <main className={styles.landing}>
            {user ? (
                <Link className={styles.login} to="/dashboard">
                    dashboard
                </Link>
            ) : (
                <Link
                    className={styles.login}
                    to="/sign-in"
                    search={redirect ? { redirect } : {}}
                >
                    sign in
                </Link>
            )}

            <h1 className={styles.title}>
                Zar Auth<span className={styles.cursor}>_</span>
            </h1>

            <a
                className={styles.brand}
                href="https://zar.mx"
                target="_blank"
                rel="noopener noreferrer"
            >
                zar.mx
            </a>
        </main>
    );
}
