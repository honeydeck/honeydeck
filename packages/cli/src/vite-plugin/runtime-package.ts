import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function runtimePackageRoot(): string {
	return resolve(
		dirname(fileURLToPath(import.meta.resolve("@honeydeck/runtime/app-shell"))),
		"../../..",
	);
}

export function runtimeThemeBaseCssPath(): string {
	return fileURLToPath(import.meta.resolve("@honeydeck/runtime/theme.css"));
}
