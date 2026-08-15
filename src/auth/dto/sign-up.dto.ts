import { Transform } from "class-transformer";
import {
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    IsStrongPassword,
    MaxLength,
} from "class-validator";
import { LOCALES, type Locale } from "@/common/locale";

export class SignUpDto {
    /**
     * Email address for the new account. Normalized to lowercase.
     * @example "user@domain.tld"
     */
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "Email address is not valid" })
    @MaxLength(254)
    email: string;

    /**
     * Account password. Must be strong: mix of upper/lowercase, number, and symbol.
     * @example "{{password}}"
     */
    @IsString()
    @MaxLength(128)
    @IsStrongPassword(
        {},
        {
            message:
                "Password must include upper and lower case letters, a number, and a symbol (8+ characters)",
        },
    )
    password: string;

    /**
     * Language for the account's emails ("en" default). Consumer apps pass
     * the language of the page the user signed up from.
     * @example "es"
     */
    @IsOptional()
    @IsIn(LOCALES)
    lang?: Locale;
}
