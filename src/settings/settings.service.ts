import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { UpdateSettingsProps } from "./interfaces/update.interface";

const SETTINGS_ID = "default";

const DEFAULTS = {
    signupEnabled: false,
};

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) {}

    public async get() {
        const row = await this.prisma.client.appSettings.findUnique({
            where: { id: SETTINGS_ID },
        });

        return row ?? { id: SETTINGS_ID, ...DEFAULTS, updatedAt: null };
    }

    public async update(data: UpdateSettingsProps) {
        return this.prisma.client.appSettings.upsert({
            where: { id: SETTINGS_ID },
            create: { id: SETTINGS_ID, ...DEFAULTS, ...data },
            update: data,
        });
    }

    /**
     * Governs direct public sign-up on auth.zar.mx only. App-mediated
     * sign-up is decided per app (App.public / AppAccess grants) instead.
     */
    public async isSignupAllowed(): Promise<boolean> {
        const settings = await this.get();
        return settings.signupEnabled;
    }
}
