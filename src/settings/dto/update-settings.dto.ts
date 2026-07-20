import { IsArray, IsBoolean, IsOptional, Matches } from "class-validator";

// Exact email ("user@example.com") or domain wildcard ("*@example.com").
const WHITELIST_ENTRY = /^(\*|[^\s@*]+)@[^\s@*]+\.[^\s@*]+$/;

export class UpdateSettingsDto {
    /**
     * Whether anyone can sign up. When false, only whitelisted emails can.
     * @example false
     */
    @IsOptional()
    @IsBoolean()
    signupEnabled?: boolean;

    /**
     * Emails allowed to sign up while sign-up is disabled.
     * Exact emails or domain wildcards.
     * @example ["boss@geoil.com", "*@geoil.com"]
     */
    @IsOptional()
    @IsArray()
    @Matches(WHITELIST_ENTRY, {
        each: true,
        message:
            "each whitelist entry must be an email or a domain wildcard like *@example.com",
    })
    signupWhitelist?: string[];
}
