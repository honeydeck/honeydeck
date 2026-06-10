import type { ColorMode } from "@honeydeck/honeydeck/components";
import { useEffect, useState } from "react";

type EffectiveColorMode = "light" | "dark";

const STORAGE_KEY = "@honeydeck/marketing-color-mode";

function isColorMode(value: string | null): value is ColorMode {
	return value === "system" || value === "light" || value === "dark";
}

function readSystemColorMode(): EffectiveColorMode {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function useColorMode() {
	const [mode, setMode] = useState<ColorMode>(() => {
		if (typeof window === "undefined") return "system";
		const storedMode = localStorage.getItem(STORAGE_KEY);
		return isColorMode(storedMode) ? storedMode : "system";
	});
	const [systemMode, setSystemMode] =
		useState<EffectiveColorMode>(readSystemColorMode);

	const effectiveMode: EffectiveColorMode =
		mode === "system" ? systemMode : mode;

	useEffect(() => {
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const updateSystemMode = () => setSystemMode(mq.matches ? "dark" : "light");

		updateSystemMode();
		mq.addEventListener("change", updateSystemMode);
		return () => mq.removeEventListener("change", updateSystemMode);
	}, []);

	useEffect(() => {
		document.documentElement.dataset.theme = effectiveMode;
		document.documentElement.dataset.honeydeckColorMode = effectiveMode;
		document.documentElement.classList.toggle("dark", effectiveMode === "dark");
		localStorage.setItem(STORAGE_KEY, mode);
	}, [effectiveMode, mode]);

	return { mode, effectiveMode, setMode };
}
