import {
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    ValidateIf,
} from "class-validator";

export class TokenDto {
    /** @example "authorization_code" */
    @IsIn(["authorization_code", "refresh_token"])
    grant_type: "authorization_code" | "refresh_token";

    /** The app id. */
    @IsString()
    @MaxLength(64)
    client_id: string;

    /** authorization_code: the code received on the redirect. */
    @ValidateIf((o) => o.grant_type === "authorization_code")
    @IsString()
    @MaxLength(128)
    code?: string;

    /** authorization_code: the PKCE verifier the challenge was built from. */
    @ValidateIf((o) => o.grant_type === "authorization_code")
    @IsString()
    @Matches(/^[A-Za-z0-9._~-]{43,128}$/, {
        message: "code_verifier must be 43 to 128 unreserved characters",
    })
    code_verifier?: string;

    /** authorization_code: must equal the redirect_uri used to get the code. */
    @ValidateIf((o) => o.grant_type === "authorization_code")
    @IsString()
    @MaxLength(512)
    redirect_uri?: string;

    /** authorization_code: optional label shown in the user's device list. */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    device_name?: string;

    /** refresh_token: the current refresh token (rotated on every use). */
    @ValidateIf((o) => o.grant_type === "refresh_token")
    @IsString()
    @MaxLength(128)
    refresh_token?: string;
}

export class RevokeDto {
    @IsString()
    @MaxLength(64)
    client_id: string;

    @IsString()
    @MaxLength(128)
    refresh_token: string;
}
