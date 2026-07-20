import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { Resend } from "resend";
import { env } from "@/env";
import { EMAIL_QUEUE } from "./email.constants";
import { SendEmailProps } from "./interfaces/send.interface";

@Processor(EMAIL_QUEUE, { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
    private readonly logger = new Logger(EmailProcessor.name);

    private readonly resend = new Resend(env.RESEND_API_KEY);

    public async process(job: Job<SendEmailProps>) {
        const props = job.data;

        // Dev default: print instead of emailing real inboxes. The text
        // version carries the same links, so flows stay fully testable.
        if (env.MAIL_DRIVER === "log") {
            this.logger.log(
                `[mail:log] To: ${props.to} | Subject: ${props.subject}\n${
                    props.text ?? props.html
                }`,
            );
            return { messageId: "logged" };
        }

        const { data, error } = await this.resend.emails.send({
            from: props.from ?? env.MAIL_FROM,
            to: props.to,
            subject: props.subject,
            html: props.html,
            text: props.text,
            replyTo: props.replyTo ?? env.MAIL_REPLY_TO,
        });

        // Resend returns errors in the response body rather than throwing.
        // Re-throw so BullMQ records the failure and retries per the queue's
        // attempts/backoff policy.
        if (error) {
            this.logger.error(`Failed to send email to ${props.to}:`, error);
            throw new Error(`${error.name}: ${error.message}`);
        }

        this.logger.log(`Email sent to ${props.to} (${data?.id})`);

        return { messageId: data?.id };
    }
}
