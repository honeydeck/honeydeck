import type { ReactNode } from "react";

export function NavBarButton({
	onClick,
	title,
	label,
	"aria-label": ariaLabel,
	disabled,
	active,
	children,
}: {
	onClick: () => void;
	title?: string;
	label?: string;
	"aria-label"?: string;
	disabled?: boolean;
	active?: boolean;
	children: ReactNode;
}) {
	const accessibleLabel = ariaLabel ?? label ?? title;
	const buttonTitle = title ?? label ?? ariaLabel;

	return (
		<button
			type="button"
			onClick={onClick}
			title={buttonTitle}
			aria-label={accessibleLabel}
			disabled={disabled}
			className={navBarButtonClass({ active, disabled })}
		>
			{children}
		</button>
	);
}

export function navBarButtonClass({
	active = false,
	disabled = false,
}: {
	active?: boolean;
	disabled?: boolean;
} = {}) {
	return `w-8 h-8 rounded border-none flex items-center justify-center shrink-0 transition-[background,color] duration-100 ease-out ${
		active ? "bg-white/15" : "bg-transparent"
	} ${disabled ? "text-white/20" : "text-white/80"}`;
}
