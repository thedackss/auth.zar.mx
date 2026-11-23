import {
    Body,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    Post,
    Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuditService } from "@/audit/audit.service";
import { requestMeta } from "@/audit/request-meta";
import { Authenticated } from "@/auth/decorators/authenticated.decorator";
import { SignUpDto } from "@/auth/dto/sign-up.dto";
import { EmailVerificationService } from "@/auth/email-verification.service";
import { TokenService } from "@/auth/token.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { CredentialsService } from "@/credentials/credentials.service";
import type { App, User } from "@/prisma/generated/client";
import { PrismaService } from "@/prisma/prisma.service";
import { UsersService } from "@/users/users.service";
import { AppsService } from "./apps.service";
import {
    AppAuthenticated,
    CurrentApp,
} from "./decorators/app-authenticated.decorator";

/**
 * Server-to-server endpoints for registered apps (X-App-Key). Public apps
 * may register anyone; private apps only pre-authorized emails. The token
 * exchange is app-scoped: private apps require an access grant, and the
 * issued JWT carries the app id as its audience.
 */
@ApiTags("app")
@Controller("app")
export class AppGatewayController {
    constructor(
        private readonly apps: AppsService,
        private readonly users: UsersService,
        private readonly credentials: CredentialsService,
        private readonly verification: EmailVerificationService,
        private readonly tokens: TokenService,
        private readonly audit: AuditService,
        private readonly prisma: PrismaService,
    ) {}

    @Post("sign-up")
    @AppAuthenticated()
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @HttpCode(HttpStatus.CREATED)
    public async signUp(
        @CurrentApp() app: App,
        @Body() body: SignUpDto,
        @Req() req: Request,
    ) {
        if (
            !app.public &&
            !(await this.apps.hasEmailGrant(app.id, body.email))
        ) {
            throw new ForbiddenException(
                "This app is private and that email has not been authorized to sign up",
            );
        }

        const user = await this.prisma.client.$transaction(async (tx) => {
            const created = await this.users.create(
                { email: body.email, locale: body.lang },
                tx,
            );

            await this.credentials.passwords.create(
                { userId: created.id, password: body.password },
                tx,
            );

            if (!app.public) {
                await this.apps.consumeEmailGrant(
                    app.id,
                    body.email,
                    created.id,
                    tx,
                );
            }

            return created;
        });

        await this.verification.issue({
            userId: user.id,
            email: user.email,
            locale: user.locale,
        });

        await this.audit.record({
            type: "SIGN_UP",
            userId: user.id,
            email: user.email,
            metadata: { appId: app.id, appName: app.name },
            ...requestMeta(req),
        });

        return {
            data: user,
            message: `User (${user.email}) created successfully. A verification email has been sent.`,
        };
    }

    @Post("token")
    @AppAuthenticated()
    @Authenticated()
    @HttpCode(HttpStatus.OK)
    public async token(
        @CurrentApp() app: App,
        @CurrentUser() user: User,
        @Req() req: Request,
    ) {
        // Private-app grants are keyed by email, so the email must be proven:
        // otherwise anyone could sign up with a pre-authorized address (or
        // pre-register it on auth.zar.mx) and inherit the grant.
        if (!app.public && !user.emailVerifiedAt) {
            throw new ForbiddenException(
                "Verify your email address before accessing this app",
            );
        }

        if (!(await this.apps.hasAccess(app, user.id))) {
            await this.audit.record({
                type: "APP_TOKEN_DENIED",
                userId: user.id,
                email: user.email,
                metadata: { appId: app.id, appName: app.name },
                ...requestMeta(req),
            });

            throw new ForbiddenException(
                "This account does not have access to this app",
            );
        }

        const data = this.tokens.sign(user, app);
        return { data, message: "Access token issued successfully" };
    }
}
