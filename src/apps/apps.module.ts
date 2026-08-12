import { Module } from "@nestjs/common";
import { AuditModule } from "@/audit/audit.module";
import { AuthModule } from "@/auth/auth.module";
import { CredentialsModule } from "@/credentials/credentials.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { UsersModule } from "@/users/users.module";
import { AppGatewayController } from "./app-gateway.controller";
import { AppKeyGuard } from "./app-key.guard";
import { AppsController } from "./apps.controller";
import { AppsService } from "./apps.service";

@Module({
    imports: [
        PrismaModule,
        AuditModule,
        AuthModule,
        CredentialsModule,
        UsersModule,
    ],
    controllers: [AppsController, AppGatewayController],
    providers: [AppsService, AppKeyGuard],
    exports: [AppsService],
})
export class AppsModule {}
