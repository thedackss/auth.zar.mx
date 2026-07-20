import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "@/auth/decorators/require-permissions.decorator";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@ApiCookieAuth()
@Controller("settings")
@RequirePermissions("settings.manage")
export class SettingsController {
    constructor(private readonly settings: SettingsService) {}

    @Get()
    public async get() {
        const data = await this.settings.get();
        return { data, message: "Settings retrieved successfully" };
    }

    @Patch()
    public async update(@Body() body: UpdateSettingsDto) {
        const data = await this.settings.update(body);
        return { data, message: "Settings updated successfully" };
    }
}
