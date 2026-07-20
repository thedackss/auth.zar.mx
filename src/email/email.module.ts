import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { EMAIL_QUEUE } from "./email.constants";
import { EmailProcessor } from "./email.processor";
import { EmailService } from "./email.service";

@Global()
@Module({
    imports: [
        BullModule.registerQueue({
            name: EMAIL_QUEUE,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: "exponential", delay: 5_000 },
                removeOnComplete: { count: 100 },
                removeOnFail: 100,
            },
        }),
    ],
    providers: [EmailService, EmailProcessor],
    exports: [EmailService],
})
export class EmailModule {}
