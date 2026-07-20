export type PrismaErrorCode = "P2002" | "P2003" | "P2025";

export type PrismaCatchMessages = Partial<Record<PrismaErrorCode, string>>;
