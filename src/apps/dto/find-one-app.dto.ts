import { IsUUID } from "class-validator";

export class FindOneAppDto {
    @IsUUID()
    id: string;
}
