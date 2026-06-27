export const HONEYDECK_APP_SHELL_PLACEHOLDER = "__HONEYDECK_APP_SHELL_ENTRY__";

export const HONEYDECK_APP_SHELL_ENTRY = "@honeydeck/runtime/app-shell";

export function injectHoneydeckAppShellEntry(html: string): string {
	return html.replace(
		HONEYDECK_APP_SHELL_PLACEHOLDER,
		HONEYDECK_APP_SHELL_ENTRY,
	);
}
