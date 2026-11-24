import { IsUUID } from "class-validator";

export class SessionParamsDto {
    @IsUUID()
    familyId: string;
}
