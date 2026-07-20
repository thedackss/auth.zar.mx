import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import { EmailService } from "@/email/email.service";
import { env } from "@/env";
import { RedisService } from "@/redis/redis.service";
import { UsersService } from "@/users/users.service";
import { VerificationInput } from "./interfaces/verification-input.interface";

const VERIFICATION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

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

    private get VerificationTemplate() {
        function html(url: string) {
            return `
            <p>¡Te damos la bienvenida a Zar!</p>
            <p>Confirma tu correo electrónico haciendo clic en el siguiente enlace:</p>
            <p><a href="${url}">Verificar correo electrónico</a></p>
            <p>Este enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
            `.trim();
        }

        function text(url: string) {
            return `
            ¡Te damos la bienvenida a Zar!

            Confirma tu correo electrónico visitando este enlace:
            ${url}

            Este enlace caduca en 24 horas. Si no creaste esta cuenta, puedes ignorar este mensaje.
            `.trim();
        }

        const subject = "Verifica tu correo electrónico";

        return { subject, html, text };
    }

    public async issue({ userId, email }: VerificationInput): Promise<void> {
        const token = this.generateToken();

        await this.redis.client.setex(
            this.tokenKey(token),
            VERIFICATION_TTL_SECONDS,
            userId,
        );

        const url = `${env.APP_URL}/auth/verify-email?token=${token}`;

        await this.email.send({
            to: email,
            subject: this.VerificationTemplate.subject,
            html: this.VerificationTemplate.html(url),
            text: this.VerificationTemplate.text(url),
        });
    }

    public async verify(token: string) {
        // GETDEL guarantees the token is single-use even under concurrent hits.
        const userId = await this.redis.client.getdel(this.tokenKey(token));

        if (!userId)
            throw new BadRequestException(
                "El enlace de verificación no es válido o ha caducado",
            );

        return this.users.update({
            id: userId,
            data: { emailVerifiedAt: new Date() },
        });
    }

    public async resend({ userId, email }: VerificationInput): Promise<void> {
        await this.issue({ userId, email });
    }
}
