export const LOCALES = ["en", "es"] as const;

export type Locale = (typeof LOCALES)[number];

/** Coerce a stored/user-supplied value to a supported locale (default en). */
export function asLocale(value: string | null | undefined): Locale {
    return value === "es" ? "es" : "en";
}
