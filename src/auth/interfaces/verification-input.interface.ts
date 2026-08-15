import type { Locale } from "@/common/locale";

export interface VerificationInput {
    userId: string;
    email: string;
    /** Email language; defaults to "en" when omitted. */
    locale?: Locale | string;
}
