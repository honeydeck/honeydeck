import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function runtimeAppShellDir(): string {
	return dirname(
		fileURLToPath(import.meta.resolve("@honeydeck/runtime/app-shell")),
	);
}

export function runtimePackageRoot(): string {
	return resolve(runtimeAppShellDir(), "../../..");
}
