import {
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Validate,
} from "class-validator";
import { IsRedirectUri } from "../redirect-uri.validator";

export class AuthorizeCheckDto {
    /** @example "01900000-0000-7000-8000-000000000001" */
    @IsString()
    @MaxLength(64)
    client_id: string;

    /** Must exactly match one of the app's registered redirect URIs. */
    @IsString()
    @MaxLength(512)
    @Validate(IsRedirectUri)
    redirect_uri: string;
}

export class AuthorizeDto extends AuthorizeCheckDto {
    /** BASE64URL(SHA256(code_verifier)), 43 chars. */
    @IsString()
    @Matches(/^[A-Za-z0-9_-]{43}$/, {
        message: "code_challenge must be a base64url SHA-256 digest",
    })
    code_challenge: string;

    /** Only S256 is accepted. */
    @IsIn(["S256"])
    code_challenge_method: "S256";

    /** Opaque value echoed back to the app on redirect. */
    @IsOptional()
    @IsString()
    @MaxLength(512)
    state?: string;
}
