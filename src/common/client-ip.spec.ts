import type { Request } from "express";
import type { App } from "@/prisma/generated/client";
import { clientIp, clientUserAgent } from "./client-ip";

const req = (headers: Record<string, string>, zarApp?: App) =>
    ({ headers, ip: "10.0.1.5", zarApp }) as unknown as Request;

const app = { id: "a1" } as App;

describe("clientIp", () => {
    it("falls back to req.ip without proxy headers", () => {
        expect(clientIp(req({}))).toBe("10.0.1.5");
    });

    it("prefers CF-Connecting-IP", () => {
        expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9" }))).toBe(
            "203.0.113.9",
        );
    });

    it("ignores X-Client-IP unless an app key authenticated the request", () => {
        const headers = {
            "cf-connecting-ip": "203.0.113.9",
            "x-client-ip": "198.51.100.7",
        };
        expect(clientIp(req(headers))).toBe("203.0.113.9");
        expect(clientIp(req(headers, app))).toBe("198.51.100.7");
    });

    it("rejects a malformed forwarded ip", () => {
        expect(
            clientIp(
                req(
                    { "cf-connecting-ip": "203.0.113.9", "x-client-ip": "lol" },
                    app,
                ),
            ),
        ).toBe("203.0.113.9");
    });

    it("accepts IPv6", () => {
        expect(clientIp(req({ "x-client-ip": "2001:db8::1" }, app))).toBe(
            "2001:db8::1",
        );
    });
});

describe("clientUserAgent", () => {
    it("uses the forwarded agent only for app-authenticated requests", () => {
        const headers = {
            "user-agent": "node",
            "x-client-user-agent": "Mozilla/5.0",
        };
        expect(clientUserAgent(req(headers))).toBe("node");
        expect(clientUserAgent(req(headers, app))).toBe("Mozilla/5.0");
    });
});
