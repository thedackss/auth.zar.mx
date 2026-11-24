import { ServiceUnavailableException } from "@nestjs/common";
import type { EmailService } from "@/email/email.service";
import { env } from "@/env";
import type { App } from "@/prisma/generated/client";
import type { PrismaService } from "@/prisma/prisma.service";
import { ContactService } from "./contact.service";

jest.mock("@/env", () => ({
    env: { CONTACT_TO: "inbox@domain.tld", ADMIN_EMAIL: undefined },
}));

const app = { id: "a1", name: "zar.software" } as App;

describe("ContactService.send", () => {
    const create = jest.fn(async ({ data }) => ({ id: "m1", ...data }));
    const prisma = { client: { contactMessage: { create } } };
    const email = { send: jest.fn() };
    const service = new ContactService(
        prisma as unknown as PrismaService,
        email as unknown as EmailService,
    );

    beforeEach(() => jest.clearAllMocks());

    it("stores the message, then emails the inbox with reply-to the sender", async () => {
        const row = await service.send(
            app,
            {
                name: "Jane",
                email: "jane@domain.tld",
                message: "Hello <b>there</b>",
                lang: "es",
            },
            { ip: "203.0.113.9", userAgent: "Mozilla/5.0" },
        );

        expect(row.id).toBe("m1");
        expect(create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                appId: "a1",
                appName: "zar.software",
                email: "jane@domain.tld",
                locale: "es",
                ip: "203.0.113.9",
            }),
        });

        const sent = email.send.mock.calls[0][0];
        expect(sent.to).toBe("inbox@domain.tld");
        expect(sent.replyTo).toBe("jane@domain.tld");
        expect(sent.subject).toBe("[zar.software] message from Jane");
        // User content is escaped in the html body.
        expect(sent.html).toContain("Hello &lt;b&gt;there&lt;/b&gt;");
        expect(sent.html).not.toContain("<b>");
        expect(sent.text).toContain("Hello <b>there</b>");
    });

    it("answers 503 when no inbox is configured", async () => {
        const mocked = env as { CONTACT_TO?: string };
        const previous = mocked.CONTACT_TO;
        mocked.CONTACT_TO = undefined;

        await expect(
            service.send(
                app,
                { name: "x", email: "x@domain.tld", message: "y" },
                {},
            ),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(create).not.toHaveBeenCalled();

        mocked.CONTACT_TO = previous;
    });
});
