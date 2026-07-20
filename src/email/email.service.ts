import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { EMAIL_JOB, EMAIL_QUEUE } from "./email.constants";
import { SendEmailProps } from "./interfaces/send.interface";

@Injectable()
export class EmailService {
    constructor(
        @InjectQueue(EMAIL_QUEUE) private readonly queue: Queue<SendEmailProps>,
    ) {}

    public async send(props: SendEmailProps) {
        return this.queue.add(EMAIL_JOB.SEND, props);
    }
}
