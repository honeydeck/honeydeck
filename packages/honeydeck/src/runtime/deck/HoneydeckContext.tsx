import { createContext, type ReactNode, useContext } from "react";
import type { EffectiveColorMode } from "../color-mode/EffectiveColorModeContext.tsx";

export type HoneydeckResolvedConfig = Record<string, unknown> & {
	title: string;
	description: string;
	aspectRatio: string;
	colorMode: "system" | "light" | "dark";
	pdfColorMode?: "light" | "dark";
	pdfSteps: "final" | "all";
	transition: string | boolean;
	transitionDuration: number;
	transitionEasing: string;
	magicCodeDuration: number;
	layouts: string;
	defaultLayout: string;
	showSlideNumbers: boolean;
};

export type HoneydeckCurrentSlide = {
	/** 1-based slide number, matching the URL. */
	index: number;
	/** 0-based step index, matching the URL. */
	step: number;
	/** Number of timeline steps on the current slide. */
	maxSteps: number;
	/** Layout map key used by the current slide. */
	layout: string;
	/** Parsed slide frontmatter handed to the layout as `frontmatter`. */
	layoutProps: Record<string, unknown>;
};

export type HoneydeckContextValue = {
	/** Resolved deck-level config, including Honeydeck defaults. */
	config: HoneydeckResolvedConfig;
	/** Current slide/step/layout state. */
	currentSlide: HoneydeckCurrentSlide;
	/** Logical slide canvas width in pixels. */
	slideWidth: number;
	/** Logical slide canvas height in pixels. */
	slideHeight: number;
	/** Effective current color mode. */
	mode: EffectiveColorMode;
};

const HoneydeckContext = createContext<HoneydeckContextValue | null>(null);

export type HoneydeckProviderProps = {
	children: ReactNode;
	value: HoneydeckContextValue;
};

export function HoneydeckProvider({ children, value }: HoneydeckProviderProps) {
	return (
		<HoneydeckContext.Provider value={value}>
			{children}
		</HoneydeckContext.Provider>
	);
}

export function useHoneydeck(): HoneydeckContextValue {
	const value = useContext(HoneydeckContext);
	if (!value) {
		throw new Error(
			"useHoneydeck must be used inside a Honeydeck presentation runtime.",
		);
	}
	return value;
}

function stringOrDefault(value: unknown, fallback: string): string {
	return typeof value === "string" && value.trim() ? value : fallback;
}

function numberOrDefault(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function durationOrDefault(value: unknown, fallback: number): number {
	return Math.max(0, Math.round(numberOrDefault(value, fallback)));
}

function aspectRatioOrDefault(value: unknown): string {
	if (typeof value !== "string") return "16:9";
	const match = value.match(/^(\d+):(\d+)$/);
	if (!match) return "16:9";
	return Number(match[1]) > 0 && Number(match[2]) > 0 ? value : "16:9";
}

export function resolveHoneydeckConfig(
	config: Record<string, unknown>,
): HoneydeckResolvedConfig {
	const colorMode =
		config.colorMode === "light" || config.colorMode === "dark"
			? config.colorMode
			: "system";
	const pdfColorMode =
		config.pdfColorMode === "light" || config.pdfColorMode === "dark"
			? config.pdfColorMode
			: undefined;
	const pdfSteps = config.pdfSteps === "all" ? "all" : "final";
	const transition =
		typeof config.transition === "string" ||
		typeof config.transition === "boolean"
			? config.transition
			: "fade";

	return {
		...config,
		title: typeof config.title === "string" ? config.title : "",
		description:
			typeof config.description === "string" ? config.description : "",
		aspectRatio: aspectRatioOrDefault(config.aspectRatio),
		colorMode,
		...(pdfColorMode ? { pdfColorMode } : {}),
		pdfSteps,
		transition,
		transitionDuration: durationOrDefault(config.transitionDuration, 200),
		transitionEasing: stringOrDefault(config.transitionEasing, "ease"),
		magicCodeDuration: durationOrDefault(config.magicCodeDuration, 800),
		layouts: stringOrDefault(config.layouts, "@honeydeck/honeydeck/layouts"),
		defaultLayout: stringOrDefault(config.defaultLayout, "Default"),
		showSlideNumbers: config.showSlideNumbers === true,
	};
}
