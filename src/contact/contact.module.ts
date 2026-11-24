import { Logger, Module, type OnModuleInit } from "@nestjs/common";
import { AppsModule } from "@/apps/apps.module";
import { EmailModule } from "@/email/email.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
    imports: [PrismaModule, EmailModule, AppsModule],
    controllers: [ContactController],
    providers: [ContactService],
})
export class ContactModule implements OnModuleInit {
    private readonly logger = new Logger(ContactModule.name);

    constructor(private readonly contact: ContactService) {}

    onModuleInit() {
        if (!this.contact.isConfigured()) {
            this.logger.warn(
                "Neither CONTACT_TO nor ADMIN_EMAIL is set: POST /contact will answer 503",
            );
        }
    }
}
