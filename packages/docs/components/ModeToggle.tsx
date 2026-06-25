"use client";

import {
	type ColorMode,
	ColorModeCycleButton,
} from "@honeydeck/honeydeck/components";
import type { ThemeSwitchProps } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { useTheme } from "fumadocs-ui/provider/base";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

function asColorMode(theme: string | undefined): ColorMode {
	if (theme === "light" || theme === "dark" || theme === "system") return theme;
	return "system";
}

export function ModeToggle({ className, mode: _mode }: ThemeSwitchProps) {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const colorMode = mounted ? asColorMode(theme) : "system";

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<ColorModeCycleButton
			colorMode={colorMode}
			onSetColorMode={(mode) => setTheme(mode)}
			iconSize={16}
			className={twMerge(
				"inline-flex size-9 items-center justify-center rounded-full border border-fd-border bg-fd-background text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring",
				className,
			)}
			data-theme-toggle=""
		/>
	);
}
