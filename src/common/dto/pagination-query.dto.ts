import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";
import { ShowDeletedQueryDto } from "./show-deleted-query.dto";

export class PaginationQueryDto extends ShowDeletedQueryDto {
    /**
     * Página a recuperar (desde 1).
     * @example 1
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    /**
     * Cantidad de elementos por página (máximo 100).
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
