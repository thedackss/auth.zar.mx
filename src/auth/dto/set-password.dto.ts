import {
    IsString,
    IsStrongPassword,
    MaxLength,
    MinLength,
} from "class-validator";

export class SetPasswordDto {
    /**
     * Single-use token from the invitation email.
     * @example "kJ8xq2rP-nV4wYt1aZ7bC3dE6fG9hL0m"
     */
    @IsString()
    @MinLength(16)
    @MaxLength(256)
    token: string;

    /**
     * New password. Must be strong: mix of upper/lowercase, number, and symbol.
     * @example "{{password}}"
     */
    @IsString()
    @MaxLength(128)
    @IsStrongPassword()
    password: string;
}
