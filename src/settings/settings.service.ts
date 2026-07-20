import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { UpdateSettingsProps } from "./interfaces/update.interface";

const SETTINGS_ID = "default";

const DEFAULTS = {
    signupEnabled: true,
    signupWhitelist: [] as string[],
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
     * Sign-up is open to everyone while signupEnabled is true; otherwise only
     * whitelisted emails may join. Whitelist entries are exact emails or
     * domain wildcards ("*@example.com"), matched case-insensitively.
     */
    public async isSignupAllowed(email: string): Promise<boolean> {
        const settings = await this.get();
        if (settings.signupEnabled) return true;

        return SettingsService.matchesWhitelist(
            email,
            settings.signupWhitelist,
        );
    }

    public static matchesWhitelist(
        email: string,
        whitelist: string[],
    ): boolean {
        const normalized = email.trim().toLowerCase();
        const domain = normalized.split("@")[1];

        return whitelist.some((rawEntry) => {
            const entry = rawEntry.trim().toLowerCase();
            if (entry.startsWith("*@"))
                return domain !== undefined && entry.slice(2) === domain;
            return entry === normalized;
        });
    }
}
