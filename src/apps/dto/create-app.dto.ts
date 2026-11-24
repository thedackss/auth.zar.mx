import {
    IsBoolean,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
} from "class-validator";

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
}
