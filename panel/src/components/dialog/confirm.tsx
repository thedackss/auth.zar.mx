import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import shared from "@/routes/dashboard/-shared.module.scss";
import styles from "./dialog.module.scss";

export interface ConfirmOptions {
    title: string;
    detail?: string;
    /** Label of the confirming button. */
    action: string;
    danger?: boolean;
}

interface Pending extends ConfirmOptions {
    resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirmation on a native <dialog>. Render `element` once in
 * the view and `await confirm({...})` before destructive actions. Escape,
 * clicking the backdrop and "cancel" all resolve false.
 */
export function useConfirm(): {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    element: ReactNode;
} {
    const [pending, setPending] = useState<Pending | null>(null);

    const confirm = useCallback(
        (options: ConfirmOptions) =>
            new Promise<boolean>((resolve) =>
                setPending({ ...options, resolve }),
            ),
        [],
    );

    const element = (
        <ConfirmDialog
            pending={pending}
            onDone={(ok) => {
                pending?.resolve(ok);
                setPending(null);
            }}
        />
    );

    return { confirm, element };
}

function ConfirmDialog({
    pending,
    onDone,
}: {
    pending: Pending | null;
    onDone: (ok: boolean) => void;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    // showModal()/close() are imperative DOM APIs; React only owns the
    // children. Keep the element's open state in sync with `pending`.
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (pending && !dialog.open) dialog.showModal();
        if (!pending && dialog.open) dialog.close();
    }, [pending]);

    return (
        <dialog
            ref={ref}
            className={styles.dialog}
            // Fires for Escape, backdrop clicks (closedby) and close(); with
            // `pending` still set it means the user dismissed without confirming.
            onClose={() => pending && onDone(false)}
            // Native light dismiss (click outside closes). Newer than React's
            // typings, so it is spread in rather than written as an attribute.
            {...{ closedby: "any" }}
        >
            {pending && (
                <form
                    className={styles.body}
                    onSubmit={(e) => {
                        e.preventDefault();
                        onDone(true);
                    }}
                >
                    <p className={styles.title}>{pending.title}</p>
                    {pending.detail && (
                        <p className={styles.detail}>{pending.detail}</p>
                    )}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={shared.action}
                            onClick={() => ref.current?.close()}
                        >
                            cancel
                        </button>
                        <button
                            type="submit"
                            className={shared.action}
                            data-tone={pending.danger ? "danger" : undefined}
                            // biome-ignore lint/a11y/noAutofocus: modal dialog, focus belongs on the primary action
                            autoFocus
                        >
                            {pending.action}
                        </button>
                    </div>
                </form>
            )}
        </dialog>
    );
}
