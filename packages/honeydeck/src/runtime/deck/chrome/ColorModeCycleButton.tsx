import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export const COLOR_MODES = ["system", "light", "dark"] as const;

export type ColorMode = (typeof COLOR_MODES)[number];

const COLOR_MODE_LABEL: Record<ColorMode, string> = {
	system: "System",
	light: "Light",
	dark: "Dark",
};

const COLOR_MODE_ICON: Record<ColorMode, LucideIcon> = {
	system: MonitorIcon,
	light: SunIcon,
	dark: MoonIcon,
};

export function getNextColorMode(mode: ColorMode): ColorMode {
	if (mode === "system") return "light";
	if (mode === "light") return "dark";
	return "system";
}

export type ColorModeCycleButtonProps = Omit<
	ComponentPropsWithoutRef<"button">,
	"aria-label" | "children" | "onClick"
> & {
	colorMode: ColorMode;
	onSetColorMode: (mode: ColorMode) => void;
	iconSize?: number;
	ariaLabel?: string;
};

export function ColorModeCycleButton({
	colorMode,
	onSetColorMode,
	iconSize = 16,
	type = "button",
	title,
	ariaLabel,
	...buttonProps
}: ColorModeCycleButtonProps) {
	const ColorModeIcon = COLOR_MODE_ICON[colorMode];
	const label = COLOR_MODE_LABEL[colorMode];

	return (
		<button
			{...buttonProps}
			type={type}
			onClick={() => onSetColorMode(getNextColorMode(colorMode))}
			title={title ?? `Color mode: ${label} - click to cycle`}
			aria-label={ariaLabel ?? `Color mode: ${label} - click to cycle`}
		>
			<ColorModeIcon aria-hidden="true" size={iconSize} />
		</button>
	);
}
