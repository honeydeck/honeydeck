/**
 * Shared utility helpers for Honeydeck layout components.
 */

import type { ReactElement, ReactNode } from "react";

/** Joins class names, filtering falsy values. No external dependencies. */
export function cn(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

/** Returns true when `title` is a non-empty ReactNode. */
export function hasTitle(title: ReactNode): title is ReactElement | string {
	if (title == null) return false;
	if (typeof title === "string") return title !== "";
	if (typeof title === "number") return true;
	if (Array.isArray(title)) return title.length > 0;
	return true;
}
