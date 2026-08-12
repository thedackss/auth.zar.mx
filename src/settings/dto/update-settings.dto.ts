import { IsBoolean, IsOptional } from "class-validator";

export class UpdateSettingsDto {
    /**
     * Allows direct public sign-up on auth.zar.mx itself. App-mediated
     * sign-up is governed per app, not by this flag.
     * @example false
     */
    @IsOptional()
    @IsBoolean()
    signupEnabled?: boolean;
}
