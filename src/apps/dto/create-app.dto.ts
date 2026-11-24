import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
    Validate,
} from "class-validator";
import { IsRedirectUri } from "@/oauth/redirect-uri.validator";

export class CreateAppDto {
    /**
     * @example "anyxa"
     */
    @IsString()
    @MinLength(2)
    @MaxLength(64)
    name: string;

    /**
     * @example "https://app.domain.tld"
     */
    @IsOptional()
    @IsUrl({ require_protocol: true })
    @MaxLength(255)
    url?: string;

    /**
     * Public apps accept any zar user; private apps require access grants.
     * @example false
     */
    @IsBoolean()
    public: boolean;

    /**
     * Server-side app whose key never reaches a browser. Only confidential
     * apps may forward their visitor's X-Client-IP / X-Client-User-Agent.
     * @example true
     */
    @IsOptional()
    @IsBoolean()
    confidential?: boolean;

    /**
     * OAuth (PKCE) callback URIs, matched exactly. https URLs or custom
     * schemes such as "xp24://auth/callback"; http only for localhost.
     * @example ["https://app.domain.tld/auth/callback", "xp24://auth/callback"]
     */
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    @MaxLength(512, { each: true })
    @Validate(IsRedirectUri, { each: true })
    redirectUris?: string[];
}
