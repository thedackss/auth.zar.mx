import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class SignInDto {
    /**
     * Email address of the account.
     * @example "empleado@hotel.com"
     */
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsEmail({}, { message: "Email address is not valid" })
    @MaxLength(254)
    email: string;

    /**
     * Account password.
     * @example "{{password}}"
     */
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    password: string;
}
