export type EffectiveColorMode = "light" | "dark";
export type ConfiguredColorMode =
	| EffectiveColorMode
	| "system"
	| string
	| null
	| undefined;

export function resolveEffectiveColorMode(
	configured: ConfiguredColorMode,
	prefersDark: boolean,
): EffectiveColorMode {
	if (configured === "light" || configured === "dark") return configured;
	return prefersDark ? "dark" : "light";
}

export function readSystemPrefersDark(): boolean {
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyHoneydeckColorMode(mode: EffectiveColorMode): void {
	document.documentElement.setAttribute("data-honeydeck-color-mode", mode);
}
