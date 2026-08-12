import { IsUUID } from "class-validator";

export class AccessParamsDto {
    @IsUUID()
    id: string;

    @IsUUID()
    accessId: string;
}
