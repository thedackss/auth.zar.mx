import type { Locale } from "@/common/locale";

export interface AuthInput {
    email: string;
    password: string;
    /** Email language for the new account; defaults to "en". */
    lang?: Locale;
}
