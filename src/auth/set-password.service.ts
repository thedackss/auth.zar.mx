import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { CredentialsService } from "@/credentials/credentials.service";
import { EmailService } from "@/email/email.service";
import { env } from "@/env";
import { RedisService } from "@/redis/redis.service";
import { UsersService } from "@/users/users.service";
import { VerificationInput } from "./interfaces/verification-input.interface";

const SET_PASSWORD_TTL_SECONDS = 60 * 60 * 24; // 24 hours

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

    private template(kind: "invite" | "reset") {
        const intro =
            kind === "invite"
                ? "Has sido invitado a Zar."
                : "Recibimos una solicitud para restablecer tu contraseña de Zar.";
        const subject =
            kind === "invite"
                ? "Establece tu contraseña de Zar"
                : "Restablece tu contraseña de Zar";
        const ignore =
            kind === "invite"
                ? "Si no esperabas esta invitación, puedes ignorar este mensaje."
                : "Si no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual seguirá funcionando.";

        function html(url: string) {
            return `
            <p>${intro}</p>
            <p>Establece tu contraseña haciendo clic en el siguiente enlace:</p>
            <p><a href="${url}">Establecer contraseña</a></p>
            <p>Este enlace caduca en 24 horas. ${ignore}</p>
            `.trim();
        }

        function text(url: string) {
            return `
            ${intro}

            Establece tu contraseña visitando este enlace:
            ${url}

            Este enlace caduca en 24 horas. ${ignore}
            `.trim();
        }

        return { subject, html, text };
    }

    public async issue(
        { userId, email }: VerificationInput,
        kind: "invite" | "reset" = "invite",
    ): Promise<void> {
        const token = this.generateToken();

        await this.redis.client.setex(
            this.tokenKey(token),
            SET_PASSWORD_TTL_SECONDS,
            userId,
        );

        const url = `${env.APP_URL}/auth/set-password?token=${token}`;
        const template = this.template(kind);

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
                "El enlace para establecer la contraseña no es válido o ha caducado",
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
