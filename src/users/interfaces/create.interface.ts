import type { Locale } from "@/common/locale";

export interface CreateUserProps {
    email: string;
    /** Email language; defaults to "en". */
    locale?: Locale;
}
