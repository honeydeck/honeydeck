import packageJson from "../../package.json" with { type: "json" };

export function formatTopLevelBanner(): string {
	return `  ✨ honeydeck v${packageJson.version} — MDX presentation toolkit`;
}

export function formatCommandBanner(): string {
	return `  ✨ Honeydeck v${packageJson.version}`;
}
