import { useEffect, useRef, useState } from "react";
import shared from "@/routes/dashboard/-shared.module.scss";
import styles from "./dialog.module.scss";

/**
 * Shows a freshly issued app key exactly once, in a modal the admin has to
 * dismiss on purpose, instead of a note that scrolls away with the page.
 */
export function KeyReveal({
    appName,
    secret,
    onDone,
}: {
    appName: string;
    secret: string;
    onDone: () => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) dialog.showModal();
    }, []);

    async function copy() {
        try {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
        } catch {
            // Clipboard unavailable (permissions, insecure context): the key
            // stays selectable in the box.
        }
    }

    return (
        <dialog ref={ref} className={styles.dialog} onClose={onDone}>
            <div className={styles.body}>
                <p className={styles.title}>key for {appName}</p>
                <p className={styles.detail}>
                    Shown only once. Store it in the app's secrets now; a lost
                    key can only be replaced, not recovered.
                </p>
                <code className={styles.key}>{secret}</code>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={shared.action}
                        onClick={copy}
                    >
                        {copied ? "copied" : "copy"}
                    </button>
                    <button
                        type="button"
                        className={shared.action}
                        onClick={() => ref.current?.close()}
                        // biome-ignore lint/a11y/noAutofocus: modal dialog, focus belongs on the dismiss action
                        autoFocus
                    >
                        done
                    </button>
                </div>
            </div>
        </dialog>
    );
}
