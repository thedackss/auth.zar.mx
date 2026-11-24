import {
    type ValidationArguments,
    ValidatorConstraint,
    type ValidatorConstraintInterface,
} from "class-validator";

const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:"]);

/** Absolute URI, https or a custom scheme; http only for localhost; no fragment. */
export function isRedirectUri(value: unknown): boolean {
    if (typeof value !== "string" || value.length === 0) return false;

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    if (url.hash) return false;
    if (BLOCKED_SCHEMES.has(url.protocol)) return false;
    if (url.protocol === "http:")
        return url.hostname === "localhost" || url.hostname === "127.0.0.1";

    return true;
}

@ValidatorConstraint({ name: "isRedirectUri" })
export class IsRedirectUri implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        return isRedirectUri(value);
    }

    defaultMessage(args: ValidationArguments): string {
        return `${args.property} must contain absolute https or custom-scheme URIs without a fragment`;
    }
}
