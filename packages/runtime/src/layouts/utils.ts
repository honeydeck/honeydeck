/**
 * Shared utility helpers for Honeydeck layout components.
 */

/** Joins class names, filtering falsy values. No external dependencies. */
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

/** Returns true when `title` is a non-empty string. */
export function hasTitle(title: unknown): title is string {
	return title != null && title !== "";
}
