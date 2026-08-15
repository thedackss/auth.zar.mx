import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { asLocale, type Locale } from "@/common/locale";
import { EmailService } from "@/email/email.service";
import { env } from "@/env";
import { RedisService } from "@/redis/redis.service";
import { UsersService } from "@/users/users.service";
import { VerificationInput } from "./interfaces/verification-input.interface";

const VERIFICATION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const TEMPLATES: Record<
    Locale,
    {
        subject: string;
        welcome: string;
        confirm: string;
        link: string;
        expires: string;
    }
> = {
    en: {
        subject: "Verify your email address",
        welcome: "Welcome to Zar!",
        confirm: "Confirm your email address by clicking the link below:",
        link: "Verify email address",
        expires:
            "This link expires in 24 hours. If you did not create this account, you can ignore this message.",
    },
    es: {
        subject: "Verifica tu correo electrónico",
        welcome: "¡Te damos la bienvenida a Zar!",
        confirm:
            "Confirma tu correo electrónico haciendo clic en el siguiente enlace:",
        link: "Verificar correo electrónico",
        expires:
            "Este enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.",
    },
};

@Injectable()
export class EmailVerificationService {
    constructor(
        private readonly redis: RedisService,
        private readonly email: EmailService,
        private readonly users: UsersService,
    ) {}

    private tokenKey(token: string): string {
        return `verify-email:${token}`;
    }

    private generateToken(): string {
        return randomBytes(32).toString("base64url");
    }

    private template(locale: Locale) {
        const t = TEMPLATES[locale];

        function html(url: string) {
            return `
            <p>${t.welcome}</p>
            <p>${t.confirm}</p>
            <p><a href="${url}">${t.link}</a></p>
            <p>${t.expires}</p>
            `.trim();
        }

        function text(url: string) {
            return `
            ${t.welcome}

            ${t.confirm}
            ${url}

            ${t.expires}
            `.trim();
        }

        return { subject: t.subject, html, text };
    }

    public async issue({
        userId,
        email,
        locale,
    }: VerificationInput): Promise<void> {
        const token = this.generateToken();

        await this.redis.client.setex(
            this.tokenKey(token),
            VERIFICATION_TTL_SECONDS,
            userId,
        );

        const url = `${env.APP_URL}/auth/verify-email?token=${token}`;
        const template = this.template(asLocale(locale));

        await this.email.send({
            to: email,
            subject: template.subject,
            html: template.html(url),
            text: template.text(url),
        });
    }

    public async verify(token: string) {
        // GETDEL guarantees the token is single-use even under concurrent hits.
        const userId = await this.redis.client.getdel(this.tokenKey(token));

        if (!userId)
            throw new BadRequestException(
                "The verification link is invalid or has expired",
            );

        return this.users.update({
            id: userId,
            data: { emailVerifiedAt: new Date() },
        });
    }

    public async resend(input: VerificationInput): Promise<void> {
        await this.issue(input);
    }
}
