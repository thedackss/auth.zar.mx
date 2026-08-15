import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { asLocale, type Locale } from "@/common/locale";
import { CredentialsService } from "@/credentials/credentials.service";
import { EmailService } from "@/email/email.service";
import { env } from "@/env";
import { RedisService } from "@/redis/redis.service";
import { UsersService } from "@/users/users.service";
import { VerificationInput } from "./interfaces/verification-input.interface";

const SET_PASSWORD_TTL_SECONDS = 60 * 60 * 24; // 24 hours

const TEMPLATES: Record<
    Locale,
    {
        action: string;
        actionText: string;
        link: string;
        expires: string;
        invite: { subject: string; intro: string; ignore: string };
        reset: { subject: string; intro: string; ignore: string };
    }
> = {
    en: {
        action: "Set your password by clicking the link below:",
        actionText: "Set your password by visiting this link:",
        link: "Set password",
        expires: "This link expires in 24 hours.",
        invite: {
            subject: "Set your Zar password",
            intro: "You have been invited to Zar.",
            ignore: "If you were not expecting this invitation, you can ignore this message.",
        },
        reset: {
            subject: "Reset your Zar password",
            intro: "We received a request to reset your Zar password.",
            ignore: "If you did not request this change, you can ignore this message; your current password will keep working.",
        },
    },
    es: {
        action: "Establece tu contraseña haciendo clic en el siguiente enlace:",
        actionText: "Establece tu contraseña visitando este enlace:",
        link: "Establecer contraseña",
        expires: "Este enlace caduca en 24 horas.",
        invite: {
            subject: "Establece tu contraseña de Zar",
            intro: "Has sido invitado a Zar.",
            ignore: "Si no esperabas esta invitación, puedes ignorar este mensaje.",
        },
        reset: {
            subject: "Restablece tu contraseña de Zar",
            intro: "Recibimos una solicitud para restablecer tu contraseña de Zar.",
            ignore: "Si no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual seguirá funcionando.",
        },
    },
};

@Injectable()
export class SetPasswordService {
    constructor(
        private readonly redis: RedisService,
        private readonly email: EmailService,
        private readonly users: UsersService,
        private readonly credentials: CredentialsService,
    ) {}

    private tokenKey(token: string): string {
        return `set-password:${token}`;
    }

    private generateToken(): string {
        return randomBytes(32).toString("base64url");
    }

    private template(kind: "invite" | "reset", locale: Locale) {
        const t = TEMPLATES[locale][kind];
        const common = TEMPLATES[locale];

        function html(url: string) {
            return `
            <p>${t.intro}</p>
            <p>${common.action}</p>
            <p><a href="${url}">${common.link}</a></p>
            <p>${common.expires} ${t.ignore}</p>
            `.trim();
        }

        function text(url: string) {
            return `
            ${t.intro}

            ${common.actionText}
            ${url}

            ${common.expires} ${t.ignore}
            `.trim();
        }

        return { subject: t.subject, html, text };
    }

    public async issue(
        { userId, email, locale }: VerificationInput,
        kind: "invite" | "reset" = "invite",
    ): Promise<void> {
        const token = this.generateToken();

        await this.redis.client.setex(
            this.tokenKey(token),
            SET_PASSWORD_TTL_SECONDS,
            userId,
        );

        const url = `${env.APP_URL}/auth/set-password?token=${token}`;
        const template = this.template(kind, asLocale(locale));

        await this.email.send({
            to: email,
            subject: template.subject,
            html: template.html(url),
            text: template.text(url),
        });
    }

    /**
     * Like issue(), but sends at most once per cooldown window per user.
     * Atomic (SET NX), so concurrent callers and restart loops cannot
     * double-send. Returns whether an email was actually sent.
     */
    public async issueOncePer(
        input: VerificationInput,
        kind: "invite" | "reset",
        cooldownSeconds: number,
    ): Promise<boolean> {
        // Keyed per kind: the 24h invite cooldown (startup loops) must not
        // block an on-demand reset via /auth/recover-password.
        const acquired = await this.redis.client.set(
            `set-password-cooldown:${kind}:${input.userId}`,
            "1",
            "EX",
            cooldownSeconds,
            "NX",
        );
        if (acquired !== "OK") return false;

        await this.issue(input, kind);
        return true;
    }

    public async setPassword(token: string, password: string) {
        // GETDEL guarantees the token is single-use even under concurrent hits.
        const userId = await this.redis.client.getdel(this.tokenKey(token));

        if (!userId)
            throw new BadRequestException(
                "The set-password link is invalid or has expired",
            );

        // set (upsert), not create: the same flow serves first-time invites
        // and password resets for users who already have a password.
        await this.credentials.passwords.set({ userId, password });

        return this.users.update({
            id: userId,
            data: { emailVerifiedAt: new Date() },
        });
    }
}
