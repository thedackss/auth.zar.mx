import { Link } from "@tanstack/react-router";
import styles from "./index.module.scss";

export default function Landing() {
    return (
        <main className={styles.landing}>
            <Link className={styles.login} to="/sign-in">
                sign in
            </Link>

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
