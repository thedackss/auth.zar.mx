import { Transform } from "class-transformer";
import {
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";
import { LOCALES, type Locale } from "@/common/locale";

const trim = ({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value;

export class SendMessageDto {
    /**
     * Sender's name.
     * @example "Jane Doe"
     */
    @Transform(trim)
    @IsString()
    @MinLength(1, { message: "Name is required" })
    @MaxLength(100)
    name: string;

    /**
     * Sender's email; replies go there.
     * @example "user@domain.tld"
     */
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "Email address is not valid" })
    @MaxLength(254)
    email: string;

    /**
     * The message body.
     * @example "Hi, I need a website for my shop."
     */
    @Transform(trim)
    @IsString()
    @MinLength(1, { message: "Message is required" })
    @MaxLength(3000)
    message: string;

    /**
     * Language of the page the form was on; drives the stored locale.
     * @example "es"
     */
    @IsOptional()
    @IsIn(LOCALES)
    lang?: Locale;

    /**
     * Honeypot: a hidden field real visitors never fill. A non-empty value
     * makes the request succeed without storing or sending anything.
     * @example ""
     */
    @IsOptional()
    @IsString()
    @MaxLength(200)
    website?: string;
}
