import { IsEmail, MaxLength } from "class-validator";

export class RecoverPasswordDto {
    /**
     * Email address of the account to recover.
     * @example "user@example.com"
     */
    @IsEmail()
    @MaxLength(254)
    email: string;
}
