import { Test, TestingModule } from "@nestjs/testing";
import type { Job } from "bullmq";
import { EmailProcessor } from "./email.processor";
import { SendEmailProps } from "./interfaces/send.interface";

// `jest.mock` replaces an ENTIRE module with a fake for this test file. The
// processor reads env vars at startup; here we feed it fixed, predictable
// values so the test doesn't depend on a real .env file.
jest.mock("@/env", () => ({
    env: {
        MAIL_DRIVER: "resend",
        RESEND_API_KEY: "re_test",
        MAIL_FROM: "Zar Auth <no-reply@localhost>",
        MAIL_REPLY_TO: "Zar <reply@localhost>",
    },
}));

// Replace the real Resend SDK with a fake. `emails.send` is a mock, so no
// actual email is ever sent and no API key is needed — we only check that the
// processor *would* send the right thing.
const send = jest.fn();
jest.mock("resend", () => ({
    Resend: jest.fn(() => ({ emails: { send } })),
}));

// A tiny helper that builds a fake BullMQ job — the processor only reads
// `job.data`, so that's all we need to provide.
const jobFor = (data: SendEmailProps) => ({ data }) as Job<SendEmailProps>;

describe("EmailProcessor", () => {
    let processor: EmailProcessor;

    beforeEach(async () => {
        // Wipe the record of previous calls so each test starts clean.
        send.mockReset();
        send.mockResolvedValue({ data: { id: "msg-1" }, error: null });

        const module: TestingModule = await Test.createTestingModule({
            providers: [EmailProcessor],
        }).compile();

        processor = module.get(EmailProcessor);
    });

    describe("process", () => {
        it("sends via Resend with mapped fields and the MAIL_FROM default", async () => {
            // Act: hand the processor a job and let it do its work.
            const result = await processor.process(
                jobFor({
                    to: "user@example.com",
                    subject: "Hola",
                    html: "<p>Hola</p>",
                }),
            );

            // Assert: the job data was mapped onto emails.send correctly, and
            // since no `from` was given it fell back to the MAIL_FROM default.
            expect(send).toHaveBeenCalledWith({
                from: "Zar Auth <no-reply@localhost>",
                to: "user@example.com",
                subject: "Hola",
                html: "<p>Hola</p>",
                text: undefined,
                replyTo: "Zar <reply@localhost>",
            });
            expect(result).toEqual({ messageId: "msg-1" });
        });

        it("honors an explicit from override", async () => {
            // Act
            await processor.process(
                jobFor({
                    to: "user@example.com",
                    subject: "Hola",
                    html: "<p>Hola</p>",
                    from: "Soporte <soporte@example.com>",
                }),
            );

            // Assert: `objectContaining` checks only the fields we care about
            // (the `from`), ignoring the rest of the send arguments.
            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    from: "Soporte <soporte@example.com>",
                }),
            );
        });

        it("honors an explicit replyTo override", async () => {
            await processor.process(
                jobFor({
                    to: "user@example.com",
                    subject: "Hola",
                    html: "<p>Hola</p>",
                    replyTo: "Otro <otro@example.com>",
                }),
            );

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    replyTo: "Otro <otro@example.com>",
                }),
            );
        });

        it("logs instead of sending when MAIL_DRIVER is log", async () => {
            const { env } = jest.requireMock("@/env");
            env.MAIL_DRIVER = "log";

            try {
                const result = await processor.process(
                    jobFor({
                        to: "user@example.com",
                        subject: "Hola",
                        html: "<p>Hola</p>",
                    }),
                );

                expect(send).not.toHaveBeenCalled();
                expect(result).toEqual({ messageId: "logged" });
            } finally {
                env.MAIL_DRIVER = "resend";
            }
        });

        it("throws when Resend returns an error so BullMQ retries", async () => {
            send.mockResolvedValue({
                data: null,
                error: { name: "validation_error", message: "bad from" },
            });

            await expect(
                processor.process(
                    jobFor({
                        to: "user@example.com",
                        subject: "Hola",
                        html: "<p>Hola</p>",
                    }),
                ),
            ).rejects.toThrow("validation_error: bad from");
        });
    });
});
