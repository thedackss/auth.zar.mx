import { Injectable, NotFoundException } from "@nestjs/common";
import { Role } from "@/prisma/generated/client";
import { PrismaTx } from "@/prisma/interfaces/transaction.interface";
import { PrismaService } from "@/prisma/prisma.service";
import { CreateUserProps } from "./interfaces/create.interface";
import { FindUserProps } from "./interfaces/find.interface";
import { UpdateUserProps } from "./interfaces/update.interface";

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    public findAll() {
        return this.prisma.client.user.findMany({ where: { deletedAt: null } });
    }

    public async adminExists(): Promise<boolean> {
        const admin = await this.prisma.client.user.findFirst({
            where: { role: Role.ADMIN, deletedAt: null },
            select: { id: true },
        });

        return admin !== null;
    }

    public async find({ id, email }: FindUserProps) {
        const where: { id?: string; email?: string; deletedAt: null } = {
            deletedAt: null,
        };

        if (id) where.id = id;
        else if (email) where.email = email;

        return this.prisma.client.user.findFirst({ where });
    }

    public async check(props: FindUserProps) {
        const user = await this.find(props);
        if (!user) throw new NotFoundException(`User not found`);

        return user;
    }

    public async create(props: CreateUserProps, tx?: PrismaTx) {
        const email = props.email.trim().toLowerCase();
        const client = tx ?? this.prisma.client;

        return await client.user
            .create({ data: { email, locale: props.locale } })
            .catch(
                this.prisma.catchKnownErrors({
                    P2002: `A user with the same email already exists`,
                    P2003: `Foreign key constraint failed while creating user, please check related data`,
                    P2025: `Related record not found while creating user, please check related data`,
                }),
            );
    }

    public async update({ id, data }: UpdateUserProps) {
        await this.check({ id });

        return this.prisma.client.user.update({ where: { id }, data });
    }

    public async delete(props: FindUserProps) {
        const user = await this.check(props);

        return this.prisma.client.user.update({
            where: { id: user.id },
            data: { deletedAt: new Date() },
        });
    }
}
