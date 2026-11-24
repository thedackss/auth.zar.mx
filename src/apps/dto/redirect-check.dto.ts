import { IsUrl, MaxLength } from "class-validator";

export class RedirectCheckDto {
    /**
     * Absolute URL the panel wants to send a signed-in user back to.
     * @example "https://app.domain.tld/callback"
     */
    @IsUrl({ require_protocol: true, require_tld: false })
    @MaxLength(2048)
    url: string;
}
