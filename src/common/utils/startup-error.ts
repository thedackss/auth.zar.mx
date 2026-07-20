// Startup failures (DB/Redis unreachable) would otherwise surface as raw
// stack dumps. Print one readable line and exit instead. Writes straight to
// stderr because the pino logger is still buffered during bootstrap.
export function exitWithConnectionError(
    service: string,
    rawUrl: string,
    error: unknown,
): never {
    // Show host:port only — never credentials from the URL.
    let target = "unknown host";
    try {
        const url = new URL(rawUrl);
        target = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
        // keep the fallback
    }

    const cause =
        error instanceof AggregateError && error.errors.length > 0
            ? error.errors[0]
            : error;
    const detail = cause instanceof Error ? cause.message : String(cause);

    process.stderr.write(
        [
            "",
            `✖ Could not connect to ${service} at ${target}`,
            `  ${detail}`,
            `  Is ${service} running? Check the URL in your .env`,
            "",
            "",
        ].join("\n"),
    );
    process.exit(1);
}
