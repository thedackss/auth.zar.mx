import { Type } from "class-transformer";
import {
    IsEmail,
    IsEnum,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from "class-validator";
import { AuthEventType } from "@/prisma/generated/enums";

export class AuditEventsQueryDto {
    /**
     * Filter by the affected user's id.
     */
    @IsOptional()
    @IsUUID()
    userId?: string;

    /**
     * Filter by event type.
     * @example "SIGN_IN_FAILURE"
     */
    @IsOptional()
    @IsEnum(AuthEventType)
    type?: AuthEventType;

    /**
     * Filter by the email recorded on the event (useful for failed
     * sign-ins against unknown accounts).
     */
    @IsOptional()
    @IsEmail()
    email?: string;

    /**
     * Page to retrieve (from 1).
     * @example 1
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    /**
     * Items per page (max 100).
     * @example 20
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 20;

    get skip(): number {
        return (this.page - 1) * this.limit;
    }
}
