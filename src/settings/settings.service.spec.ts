import { SettingsService } from "./settings.service";

describe("SettingsService.matchesWhitelist", () => {
    it("matches exact emails case-insensitively", () => {
        expect(
            SettingsService.matchesWhitelist("Boss@Geoil.com", [
                "boss@geoil.com",
            ]),
        ).toBe(true);
    });

    it("matches domain wildcards", () => {
        expect(
            SettingsService.matchesWhitelist("diego@geoil.com", [
                "*@geoil.com",
            ]),
        ).toBe(true);
    });

    it("does not match other domains against a wildcard", () => {
        expect(
            SettingsService.matchesWhitelist("diego@gmail.com", [
                "*@geoil.com",
            ]),
        ).toBe(false);
    });

    it("does not match when the whitelist is empty", () => {
        expect(SettingsService.matchesWhitelist("diego@geoil.com", [])).toBe(
            false,
        );
    });

    it("trims whitespace in entries and input", () => {
        expect(
            SettingsService.matchesWhitelist(" diego@geoil.com ", [
                " *@geoil.com ",
            ]),
        ).toBe(true);
    });
});
