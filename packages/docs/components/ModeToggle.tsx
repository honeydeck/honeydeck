"use client";

import {
	type ColorMode,
	ColorModeCycleButton,
} from "@honeydeck/runtime/components";
import type { ThemeSwitchProps } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { useTheme } from "fumadocs-ui/provider/base";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

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
		<Button
			as={ColorModeCycleButton}
			colorMode={colorMode}
			onSetColorMode={(mode) => setTheme(mode)}
			iconSize={16}
			className={className}
			data-theme-toggle=""
			size="icon"
		/>
	);
}
