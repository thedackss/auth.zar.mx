import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { exitWithConnectionError } from "@/common/utils/startup-error";
import { PrismaClient } from "./generated/client";
import {
    PrismaCatchMessages,
    PrismaErrorCode,
} from "./interfaces/error.interface";

function createClient() {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });
    return new PrismaClient({ adapter });
}

export type ExtendedPrismaClient = ReturnType<typeof createClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly exceptionByCode: Record<
        PrismaErrorCode,
        new (
            message: string,
        ) => HttpException
    > = {
        P2002: ConflictException,
        P2003: BadRequestException,
        P2025: NotFoundException,
    };

    private readonly logger = new Logger(PrismaService.name);

    public readonly client: ExtendedPrismaClient = createClient();

    public catchKnownErrors(messages: PrismaCatchMessages) {
        return (error: unknown): never => {
            if (error instanceof PrismaClientKnownRequestError) {
                const code = error.code as PrismaErrorCode;
                const message = messages[code];
                const Exception = this.exceptionByCode[code];
                if (message && Exception) throw new Exception(message);
            }
            throw error;
        };
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.client.$connect();
            // $connect can be lazy with driver adapters; force a real
            // round-trip so an unreachable database fails here, not on the
            // first request.
            await this.client.$queryRaw`SELECT 1`;
            this.logger.log("Database connection successful.");
        } catch (error) {
            // process.env, not @/env: this file is loaded by unit tests,
            // which must not trigger the env validation (and its exit).
            exitWithConnectionError(
                "Postgres",
                process.env.DATABASE_URL ?? "",
                error,
            );
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.$disconnect();
    }
}
