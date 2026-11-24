import { Module } from "@nestjs/common";
import { RefreshTokensModule } from "@/oauth/refresh-tokens.module";
import { SessionsModule } from "@/sessions/sessions.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
    imports: [SessionsModule, RefreshTokensModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
