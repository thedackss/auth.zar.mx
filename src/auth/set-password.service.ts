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

    private get InviteTemplate() {
        function html(url: string) {
            return `
            <p>Has sido invitado a Zar.</p>
            <p>Establece tu contraseña haciendo clic en el siguiente enlace:</p>
            <p><a href="${url}">Establecer contraseña</a></p>
            <p>Este enlace caduca en 24 horas. Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
            `.trim();
        }

        function text(url: string) {
            return `
            Has sido invitado a Zar.

            Establece tu contraseña visitando este enlace:
            ${url}

            Este enlace caduca en 24 horas. Si no esperabas esta invitación, puedes ignorar este mensaje.
            `.trim();
        }

        const subject = "Establece tu contraseña de Zar";

        return { subject, html, text };
    }

    public async issue({ userId, email }: VerificationInput): Promise<void> {
        const token = this.generateToken();

        await this.redis.client.setex(
            this.tokenKey(token),
            SET_PASSWORD_TTL_SECONDS,
            userId,
        );

        const url = `${env.APP_URL}/auth/set-password?token=${token}`;

        await this.email.send({
            to: email,
            subject: this.InviteTemplate.subject,
            html: this.InviteTemplate.html(url),
            text: this.InviteTemplate.text(url),
        });
    }

    public async setPassword(token: string, password: string) {
        // GETDEL guarantees the token is single-use even under concurrent hits.
        const userId = await this.redis.client.getdel(this.tokenKey(token));

        if (!userId)
            throw new BadRequestException(
                "El enlace para establecer la contraseña no es válido o ha caducado",
            );

        await this.credentials.passwords.create({ userId, password });

        return this.users.update({
            id: userId,
            data: { emailVerifiedAt: new Date() },
        });
    }
}
