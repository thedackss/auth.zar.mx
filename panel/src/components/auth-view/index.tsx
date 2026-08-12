import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import styles from "./index.module.scss";

interface AuthViewProps {
    title: string;
    children: ReactNode;
}

export default function AuthView({ title, children }: AuthViewProps) {
    return (
        <main className={styles.view}>
            <header>
                <Link className={styles.home} to="/">
                    Zar Auth<span>_</span>
                </Link>
                <h1 className={styles.title}>{title}</h1>
            </header>
            {children}
        </main>
    );
}
