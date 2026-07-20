import { getQueueToken } from "@nestjs/bullmq";
import { Test, TestingModule } from "@nestjs/testing";
import { EMAIL_JOB, EMAIL_QUEUE } from "./email.constants";
import { EmailService } from "./email.service";

// `describe` groups related tests under a label. It does nothing on its own —
// it just organizes the output and lets you nest related cases together.
describe("EmailService", () => {
    let service: EmailService; // the thing under test
    let add: jest.Mock; // a fake stand-in for the queue's `add` method

    // `beforeEach` runs before every single `it` below, giving each test a
    // fresh, clean setup so tests never leak state into one another.
    beforeEach(async () => {
        // A "mock": a fake function that records how it was called and returns
        // whatever we tell it to. The real queue talks to Redis; we don't want
        // that in a unit test, so we replace it with this fake.
        add = jest.fn().mockResolvedValue({ id: "job-1" });

        // Build a miniature version of the app containing only EmailService,
        // and hand it our fake queue instead of the real one. `getQueueToken`
        // is the "name" Nest uses to inject the email queue.
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EmailService,
                { provide: getQueueToken(EMAIL_QUEUE), useValue: { add } },
            ],
        }).compile();

        // Pull the wired-up EmailService out so each test can use it.
        service = module.get(EmailService);
    });

    describe("send", () => {
        it("enqueues a send job with the email payload", async () => {
            // Arrange: prepare the input.
            const props = {
                to: "user@example.com",
                subject: "Hola",
                html: "<p>Hola</p>",
            };

            // Act: run the actual code we want to verify.
            const job = await service.send(props);

            // Assert: check it behaved correctly. Here we interrogate the fake
            // queue — "were you called with the right job name and payload?"
            expect(add).toHaveBeenCalledWith(EMAIL_JOB.SEND, props);
            expect(job).toEqual({ id: "job-1" });
        });

        it("does not send inline (returns before any SMTP work)", async () => {
            // Act
            await service.send({
                to: "user@example.com",
                subject: "Hola",
                html: "<p>Hola</p>",
            });

            // Assert: send() should only enqueue once and do nothing else —
            // this is the "always enqueue, never block" contract.
            expect(add).toHaveBeenCalledTimes(1);
        });
    });
});
