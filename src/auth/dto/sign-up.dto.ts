import { Transform } from "class-transformer";
import {
    IsEmail,
    IsString,
    IsStrongPassword,
    MaxLength,
} from "class-validator";

export class SignUpDto {
    /**
     * Email address for the new account. Normalized to lowercase.
     * @example "empleado@hotel.com"
     */
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "El correo electrónico no es válido" })
    @MaxLength(254)
    email: string;

    /**
     * Account password. Must be strong: mix of upper/lowercase, number, and symbol.
     * @example "{{password}}"
     */
    @IsString()
    @MaxLength(128)
    @IsStrongPassword()
    password: string;
}
