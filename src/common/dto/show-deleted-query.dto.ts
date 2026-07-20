import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ShowDeletedQueryDto {
    /**
     * Incluir registros borrados lógicamente. Solo surte efecto para
     * administradores; para el resto se ignora.
     * @example false
     */
    @IsOptional()
    @Transform(({ value }) => value === true || value === "true")
    @IsBoolean()
    showDeleted: boolean = false;
}
