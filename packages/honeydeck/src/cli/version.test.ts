import assert from "node:assert/strict";
import { describe, it } from "node:test";
import packageJson from "../../package.json" with { type: "json" };
import { formatCommandBanner, formatTopLevelBanner } from "./banner.ts";

describe("CLI version banners", () => {
	it("match the package version", () => {
		assert.equal(
			formatTopLevelBanner(),
			`  ✨ honeydeck v${packageJson.version} — MDX presentation toolkit`,
		);
		assert.equal(
			formatCommandBanner(),
			`  ✨ Honeydeck v${packageJson.version}`,
		);
	});
});
