import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { CredentialsService } from "@/credentials/credentials.service";
import { env } from "@/env";
import { Role } from "@/prisma/generated/client";
import { UsersService } from "@/users/users.service";
import { SetPasswordService } from "./set-password.service";

/**
 * Bootstraps the first admin from ADMIN_EMAIL. Runs only the very first time:
 * once any admin exists, it does nothing (even if ADMIN_EMAIL later changes),
 * so it can never create a second admin.
 *
 * Recovery: if the bootstrapped admin still has no password (invite link was
 * lost or expired), a fresh invite is re-sent on every startup until one is
 * set.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
    private readonly logger = new Logger(AdminBootstrapService.name);

    constructor(
        private readonly users: UsersService,
        private readonly setPassword: SetPasswordService,
        private readonly credentials: CredentialsService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const email = env.ADMIN_EMAIL;
        if (!email) return;

        if (await this.users.adminExists()) {
            await this.reinviteIfPasswordless(email);
            return;
        }

        const existing = await this.users.find({ email });
        if (existing) {
            const updated = await this.users.update({
                id: existing.id,
                data: { role: Role.ADMIN },
            });
            this.logger.log(
                `Admin bootstrap: promoted ${updated.email} to ADMIN`,
            );
            return;
        }

        // No matching user: create a passwordless admin and email an invite to
        // set their password.
        const user = await this.users.create({ email });
        await this.users.update({
            id: user.id,
            data: { role: Role.ADMIN },
        });
        await this.setPassword.issue({ userId: user.id, email: user.email });
        this.logger.log(
            `Admin bootstrap: created ${user.email} as ADMIN and sent a set-password invite`,
        );
    }

    private async reinviteIfPasswordless(email: string): Promise<void> {
        const user = await this.users.find({ email });
        if (!user || user.role !== Role.ADMIN || user.disabledAt) return;

        const credential = await this.credentials.find({
            userId: user.id,
            provider: "password",
        });
        if (credential) return;

        // Cooldown guards against restart loops spamming the inbox (and
        // hurting sender reputation): at most one invite per 24h. A reset
        // can always be forced on demand via POST /auth/recover-password.
        const sent = await this.setPassword.issueOncePer(
            { userId: user.id, email: user.email },
            "invite",
            60 * 60 * 24,
        );

        if (sent) {
            this.logger.warn(
                `Admin bootstrap: ${user.email} has no password yet, re-sent the set-password invite`,
            );
        } else {
            this.logger.warn(
                `Admin bootstrap: ${user.email} has no password yet; an invite was already sent in the last 24h, not re-sending`,
            );
        }
    }
}
