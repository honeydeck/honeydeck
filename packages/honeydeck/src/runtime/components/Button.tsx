import type { ComponentPropsWithoutRef } from "react";

export const transitionClass =
	"transition-[background-color,border-color,color,box-shadow] duration-150";
export const hoverBorderClass =
	"hover:border-[color-mix(in_oklab,var(--color-primary)_48%,var(--color-border))]";
export const surfaceControlClass = `border border-border bg-surface/86 text-foreground ${hoverBorderClass}`;

const buttonBaseClass = `inline-flex items-center justify-center gap-2.5 rounded-lg px-4 py-3 font-black no-underline ${transitionClass}`;

export const buttonPrimaryClass = `${buttonBaseClass} border border-black/10 bg-primary text-primary-foreground shadow-[0_14px_30px_color-mix(in_oklab,var(--color-primary)_26%,transparent)] ${hoverBorderClass}`;
export const buttonSecondaryClass = `${buttonBaseClass} ${surfaceControlClass}`;
export const iconButtonClass = `inline-flex min-h-[2.35rem] min-w-[2.35rem] items-center justify-center gap-1.5 rounded-lg px-3 py-2 no-underline ${surfaceControlClass} ${transitionClass}`;
export const smallButtonClass = `inline-flex min-h-[2.35rem] flex-1 basis-48 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 no-underline md:flex-none ${surfaceControlClass} ${transitionClass}`;
export const quietLinkClass = `inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-surface-foreground/70 no-underline hover:text-foreground ${hoverBorderClass} ${transitionClass}`;

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "icon"
	| "small"
	| "quiet";

const buttonClassByVariant: Record<ButtonVariant, string> = {
	primary: buttonPrimaryClass,
	secondary: buttonSecondaryClass,
	icon: iconButtonClass,
	small: smallButtonClass,
	quiet: quietLinkClass,
};

export function buttonClass(
	variant: ButtonVariant = "secondary",
	className?: string,
) {
	const baseClass = buttonClassByVariant[variant];
	return className ? `${baseClass} ${className}` : baseClass;
}

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
	variant?: ButtonVariant;
};

export function Button({
	variant = "secondary",
	className,
	type = "button",
	...buttonProps
}: ButtonProps) {
	return (
		<button
			{...buttonProps}
			type={type}
			className={buttonClass(variant, className)}
		/>
	);
}
