/**
 * Shared slide data for Honeydeck runtime.
 *
 * Extracts and exposes all slide metadata from `virtual:honeydeck/slides` in a
 * single place so that Deck, PresenterView, and OverviewView can all import
 * from here instead of duplicating the assembly logic.
 *
 * Also exports `resolveLayout` — the layout-lookup helper with dev-mode
 * fallback warning.
 */

import { config } from "virtual:honeydeck/config";
import { layoutMap } from "virtual:honeydeck/layouts";
import * as slideModules from "virtual:honeydeck/slides";
import type { ComponentType } from "react";
import { parseAspectRatio } from "./aspectRatio.ts";
import type { LayoutProps } from "./types.ts";

// ---------------------------------------------------------------------------
// Constants — derived from config.aspectRatio (default 16:9 → 1920×1080)
// ---------------------------------------------------------------------------

const _dimensions = parseAspectRatio(config.aspectRatio);
export const BASE_WIDTH: number = _dimensions.width;
export const BASE_HEIGHT: number = _dimensions.height;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SlideData = {
	/** Stable slide id derived from the virtual module export name. */
	id: string;
	/** Compiled slide React component. */
	Component: ComponentType;
	/** Number of timeline steps on this slide. */
	stepCount: number;
	/** Plain-text content of the extracted h1. */
	title: string;
	/** Parsed YAML frontmatter. */
	frontmatter: Record<string, unknown>;
	/** Layout name from frontmatter.layout, or 'Default' when absent. */
	layoutName: string;
	/** Explicit `data-magic-id` values authored in this slide's MDX source. */
	magicIds: string[];
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const { slideCount } = slideModules;
const _allExports = slideModules as unknown as Record<string, unknown>;

function buildSlideData(): SlideData[] {
	return Array.from({ length: slideCount }, (_, i) => {
		const Component = _allExports[`Slide${i}`] as ComponentType | undefined;
		if (!Component) {
			throw new Error(
				`[honeydeck] Slide${i} not found in virtual:honeydeck/slides — ` +
					`deck reports slideCount=${slideCount}. ` +
					`This is a bug in the virtual module plugin.`,
			);
		}
		return {
			id: `Slide${i}`,
			Component,
			stepCount: (_allExports[`stepCount${i}`] as number | undefined) ?? 0,
			title: (_allExports[`slideTitle${i}`] as string | undefined) ?? "",
			frontmatter:
				(_allExports[`slideFrontmatter${i}`] as
					| Record<string, unknown>
					| undefined) ?? {},
			layoutName:
				(_allExports[`slideLayout${i}`] as string | undefined) ||
				(config.defaultLayout as string | undefined) ||
				"Default",
			magicIds: (_allExports[`slideMagicIds${i}`] as string[] | undefined) ?? [],
		};
	});
}

/** All slide data in deck order. Singleton — assembled once at import time. */
export const slideData: SlideData[] = buildSlideData();

// ---------------------------------------------------------------------------
// Layout resolution
// ---------------------------------------------------------------------------

/**
 * Look up a layout component by name.
 * Falls back to Default with a console warning in dev when the name isn't
 * registered. Build/PDF hard-error behavior is enforced when Vite runs in
 * production mode.
 */
export function resolveLayout(
	layoutName: string,
): ComponentType<LayoutProps<Record<string, unknown>>> {
	const availableLayouts = Object.keys(layoutMap);
	const layout = layoutMap[layoutName];
	if (layout)
		return layout as ComponentType<LayoutProps<Record<string, unknown>>>;

	const fallbackName =
		(config.defaultLayout as string | undefined) || "Default";
	const fallbackEntry = layoutMap[fallbackName]
		? { name: fallbackName, Component: layoutMap[fallbackName] }
		: layoutMap.Default
			? { name: "Default", Component: layoutMap.Default }
			: availableLayouts
					.map((name) => ({ name, Component: layoutMap[name] }))
					.find((entry) => entry.Component);
	const fallback = fallbackEntry?.Component;

	if (layoutName) {
		const message =
			`Layout "${layoutName}" not found in layout map.\n` +
			`Available layouts: ${availableLayouts.join(", ") || "(none)"}`;

		const isProduction =
			(import.meta as unknown as { env?: { PROD?: boolean } }).env?.PROD ??
			false;
		if (isProduction) {
			throw new Error(message);
		}

		console.warn(
			`[honeydeck] ⚠️  Layout "${layoutName}" not found. Falling back to ${fallbackEntry?.name ?? "nothing"}. ` +
				`Available: ${availableLayouts.join(", ") || "(none)"}`,
		);
	}

	if (!fallback) {
		throw new Error(
			"[honeydeck] No layouts are available in the active layout map.",
		);
	}

	return fallback as ComponentType<LayoutProps<Record<string, unknown>>>;
}
