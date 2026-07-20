import { IsString, MaxLength, MinLength } from "class-validator";

export class VerifyEmailDto {
    /**
     * Single-use verification token from the email link.
     * @example "kJ8xq2rP-nV4wYt1aZ7bC3dE6fG9hL0m"
     */
    @IsString()
    @MinLength(16)
    @MaxLength(256)
    token: string;
}
