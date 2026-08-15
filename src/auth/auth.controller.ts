import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Query,
    Req,
    Res,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { AuditService } from "@/audit/audit.service";
import { requestMeta } from "@/audit/request-meta";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { env } from "@/env";
import type { User } from "@/prisma/generated/client";
import { SessionsService } from "@/sessions/sessions.service";
import { AuthService } from "./auth.service";
import { Authenticated } from "./decorators/authenticated.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { RecoverPasswordDto } from "./dto/recover-password.dto";
import { SetPasswordDto } from "./dto/set-password.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignUpDto } from "./dto/sign-up.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { EmailVerificationService } from "./email-verification.service";
import { SetPasswordService } from "./set-password.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
    constructor(
        private readonly auth: AuthService,
        private readonly sessions: SessionsService,
        private readonly verification: EmailVerificationService,
        private readonly setPasswordService: SetPasswordService,
        private readonly audit: AuditService,
    ) {}

    private setSessionCookie(res: Response, sessionId: string) {
        res.cookie(env.SESSION_COOKIE_NAME, sessionId, {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: env.SESSION_TTL_SECONDS * 1000,
        });
    }

    @Get("me")
    @Authenticated()
    public async me(@CurrentUser() data: User) {
        return { data, message: "Current user retrieved successfully" };
    }

    @Post("sign-up")
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.CREATED)
    public async signUp(
        @Body() body: SignUpDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const user = await this.auth.signUp(body);
        await this.verification.issue({
            userId: user.id,
            email: user.email,
            locale: user.locale,
        });

        const sessionId = await this.sessions.create({ userId: user.id });
        this.setSessionCookie(res, sessionId);

        await this.audit.record({
            type: "SIGN_UP",
            userId: user.id,
            email: user.email,
            ...requestMeta(req),
        });

        return {
            data: user,
            message: `User (${user.email}) created successfully. A verification email has been sent.`,
        };
    }

    @Post("sign-in")
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async signIn(
        @Body() body: SignInDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        let user: User;
        try {
            user = await this.auth.signIn(body);
        } catch (error) {
            await this.audit.record({
                type: "SIGN_IN_FAILURE",
                email: body.email,
                ...requestMeta(req),
            });
            throw error;
        }

        const sessionId = await this.sessions.create({ userId: user.id });
        this.setSessionCookie(res, sessionId);

        await this.audit.record({
            type: "SIGN_IN_SUCCESS",
            userId: user.id,
            email: user.email,
            ...requestMeta(req),
        });

        return {
            data: user,
            message: `User (${user.email}) signed in successfully`,
        };
    }

    @Post("sign-out")
    @HttpCode(HttpStatus.OK)
    public async signOut(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const sessionId = req.cookies?.[env.SESSION_COOKIE_NAME];
        if (sessionId) await this.sessions.destroy(sessionId);
        res.clearCookie(env.SESSION_COOKIE_NAME);

        if (req.user) {
            await this.audit.record({
                type: "SIGN_OUT",
                userId: req.user.id,
                ...requestMeta(req),
            });
        }

        return { data: null, message: "Signed out successfully" };
    }

    @Post("sign-out-all")
    @Authenticated()
    @HttpCode(HttpStatus.OK)
    public async signOutAll(
        @CurrentUser() user: User,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.sessions.destroyAll(user.id);
        res.clearCookie(env.SESSION_COOKIE_NAME);

        await this.audit.record({
            type: "SIGN_OUT_ALL",
            userId: user.id,
            ...requestMeta(req),
        });
        return {
            data: null,
            message: "Signed out from all devices successfully",
        };
    }

    @Post("recover-password")
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async recoverPassword(
        @Body() body: RecoverPasswordDto,
        @Req() req: Request,
    ) {
        // Always the same response, whether the account exists or not, so
        // this endpoint cannot be used to probe which emails are registered.
        const user = await this.auth.findAccountForRecovery(body.email);

        if (user) {
            // Per-user cooldown: repeated requests within 5 minutes send
            // nothing, protecting the inbox and our sender reputation.
            await this.setPasswordService.issueOncePer(
                { userId: user.id, email: user.email, locale: user.locale },
                "reset",
                60 * 5,
            );
        }

        await this.audit.record({
            type: "PASSWORD_RECOVER_REQUESTED",
            userId: user?.id,
            email: body.email,
            ...requestMeta(req),
        });

        return {
            data: null,
            message:
                "If an account exists for that email, a password reset link has been sent.",
        };
    }

    @Post("set-password")
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async setPassword(
        @Body() body: SetPasswordDto,
        @Req() req: Request,
    ) {
        const user = await this.setPasswordService.setPassword(
            body.token,
            body.password,
        );

        await this.audit.record({
            type: "PASSWORD_SET",
            userId: user.id,
            email: user.email,
            ...requestMeta(req),
        });
        return {
            data: user,
            message: "Password set successfully. You can now sign in.",
        };
    }

    @Get("verify-email")
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async verifyEmail(
        @Query() query: VerifyEmailDto,
        @Req() req: Request,
    ) {
        const user = await this.verification.verify(query.token);

        await this.audit.record({
            type: "EMAIL_VERIFIED",
            userId: user.id,
            email: user.email,
            ...requestMeta(req),
        });
        return {
            data: user,
            message: "Email verified successfully",
        };
    }

    @Post("resend-verification")
    @Authenticated()
    @Throttle({ default: { limit: 3, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async resendVerification(@CurrentUser() user: User) {
        if (user.emailVerifiedAt)
            return { data: null, message: "Email is already verified" };

        await this.verification.resend({
            userId: user.id,
            email: user.email,
            locale: user.locale,
        });
        return { data: null, message: "Verification email sent" };
    }

    @Post("change-password")
    @Authenticated()
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.OK)
    public async changePassword(
        @CurrentUser() user: User,
        @Body() body: ChangePasswordDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        await this.auth.changePassword({
            userId: user.id,
            currentPassword: body.currentPassword,
            newPassword: body.newPassword,
        });

        await this.audit.record({
            type: "PASSWORD_CHANGED",
            userId: user.id,
            ...requestMeta(req),
        });

        await this.sessions.destroyAll(user.id);
        const sessionId = await this.sessions.create({ userId: user.id });
        this.setSessionCookie(res, sessionId);

        return {
            data: null,
            message:
                "Password changed successfully. Other sessions were signed out.",
        };
    }
}
