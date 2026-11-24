import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";
import { PaginationQueryDto } from "@/common/dto/pagination-query.dto";

export class MessagesQueryDto extends PaginationQueryDto {
    /**
     * Only messages not yet marked as read.
     * @example false
     */
    @IsOptional()
    @Transform(({ value }) => value === true || value === "true")
    @IsBoolean()
    unread: boolean = false;
}
