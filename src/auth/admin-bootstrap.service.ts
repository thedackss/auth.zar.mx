import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { env } from "@/env";
import { Role } from "@/prisma/generated/client";
import { UsersService } from "@/users/users.service";
import { SetPasswordService } from "./set-password.service";

/**
 * Bootstraps the first admin from ADMIN_EMAIL. Runs only the very first time:
 * once any admin exists, it does nothing (even if ADMIN_EMAIL later changes),
 * so it can never create a second admin.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
    private readonly logger = new Logger(AdminBootstrapService.name);

    constructor(
        private readonly users: UsersService,
        private readonly setPassword: SetPasswordService,
    ) {}

    async onApplicationBootstrap(): Promise<void> {
        const email = env.ADMIN_EMAIL;
        if (!email) return;

        // Only bootstrap when there is no admin yet.
        if (await this.users.adminExists()) return;

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
}
