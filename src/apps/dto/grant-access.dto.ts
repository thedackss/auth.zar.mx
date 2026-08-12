import { IsEmail, MaxLength } from "class-validator";

export class GrantAccessDto {
    /**
     * Email to grant. Binds to the existing user with that email, or
     * pre-authorizes the email to sign up through this app.
     * @example "user@example.com"
     */
    @IsEmail()
    @MaxLength(254)
    email: string;
}
