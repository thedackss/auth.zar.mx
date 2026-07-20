import {
    IsString,
    IsStrongPassword,
    MaxLength,
    MinLength,
} from "class-validator";

export class ChangePasswordDto {
    /**
     * The account's current password.
     * @example "{{password}}"
     */
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    currentPassword: string;

    /**
     * New password. Must be strong: mix of upper/lowercase, number, and symbol.
     * @example "{{newPassword}}"
     */
    @IsString()
    @MaxLength(128)
    @IsStrongPassword()
    newPassword: string;
}
