import { twMerge } from "tailwind-merge";

export function cn(...classes: (false | null | string | undefined)[]) {
	return twMerge(classes.filter(Boolean).join(" "));
}
