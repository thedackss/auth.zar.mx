import { PrismaClient } from "../generated/client";

export type PrismaTx = Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;
