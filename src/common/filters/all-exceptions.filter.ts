import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Prisma } from "@/prisma/generated/client";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    public catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        const { status, message } = this.normalize(exception);

        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${req.method} ${req.url} -> ${status}: ${message}`,
                exception instanceof Error
                    ? exception.stack
                    : String(exception),
            );
        }

        res.status(status).json({
            message,
            data: null,
        });
    }

    private normalize(exception: unknown) {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            let message: string;

            if (typeof response === "string") {
                message = response;
            } else if (
                typeof response === "object" &&
                response !== null &&
                "message" in response
            ) {
                const raw = (response as { message?: string | string[] })
                    .message;
                message = Array.isArray(raw)
                    ? raw.join(", ")
                    : (raw ?? exception.message);
            } else {
                message = exception.message;
            }

            return { status: exception.getStatus(), message };
        }

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            return this.normalizePrisma(exception);
        }

        return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "An unexpected error occurred.",
        };
    }

    private formatTarget(meta: unknown): string | null {
        const target = (meta as { target?: unknown })?.target;
        if (Array.isArray(target)) return target.join(", ");
        if (typeof target === "string") return target;
        return null;
    }

    private normalizePrisma(exception: Prisma.PrismaClientKnownRequestError) {
        switch (exception.code) {
            case "P2002": {
                const fields = this.formatTarget(exception.meta);
                return {
                    status: HttpStatus.CONFLICT,
                    message: fields
                        ? `Unique constraint failed on: ${fields}`
                        : "Unique constraint failed",
                };
            }
            case "P2025":
                return {
                    status: HttpStatus.NOT_FOUND,
                    message: "Record not found",
                };
            case "P2003":
                return {
                    status: HttpStatus.BAD_REQUEST,
                    message: "Foreign key constraint failed",
                };
            default:
                return {
                    status: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: "Database error",
                };
        }
    }
}
