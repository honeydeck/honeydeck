import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "default" | "icon" | "sm";

function getVariantClass(variant: ButtonVariant) {
	if (variant === "primary") {
		return "border border-black/10 bg-primary text-primary-foreground shadow-[0_14px_30px_color-mix(in_oklab,var(--color-primary)_26%,transparent)]";
	}

	return "border border-transparent bg-transparent text-inherit shadow-none";
}

function getSizeClass(size: ButtonSize) {
	if (size === "icon") return "size-9 p-0";
	if (size === "sm") return "px-3 py-2 text-sm";
	return "px-4 py-3";
}

export function buttonClassName({
	className,
	size = "default",
	variant = "secondary",
}: {
	className?: string;
	size?: ButtonSize;
	variant?: ButtonVariant;
} = {}) {
	return cn(
		"inline-flex items-center justify-center gap-2.5 rounded-lg font-black no-underline",
		"transition-[background-color,border-color,color,box-shadow] duration-150",
		"hover:border-[color-mix(in_oklab,var(--color-primary)_48%,var(--color-border))]",
		getVariantClass(variant),
		getSizeClass(size),
		className,
	);
}

type ButtonOwnProps = {
	className?: string;
	size?: ButtonSize;
	variant?: ButtonVariant;
};

type ButtonProps<TElement extends ElementType> = ButtonOwnProps & {
	as?: TElement;
} & Omit<ComponentPropsWithoutRef<TElement>, keyof ButtonOwnProps | "as">;

export function Button<TElement extends ElementType = "button">({
	as,
	className,
	size,
	variant,
	...props
}: ButtonProps<TElement>) {
	const Component = as ?? "button";

	return (
		<Component
			className={buttonClassName({ className, size, variant })}
			{...props}
		/>
	);
}
