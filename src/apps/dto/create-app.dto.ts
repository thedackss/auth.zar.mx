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
}
