/**
 * DocsView — built-in runtime reference for the active Honeydeck setup.
 *
 * Routes:
 *   /#/theme
 *   /#/layouts
 *   /#/components
 */

import { useEffect, useRef } from "react";
import type { ColorMode } from "../deck/chrome/ColorModeCycleButton.tsx";
import {
	type HotkeyDefinition,
	registerHotkeys,
} from "../navigation/hotkeys.ts";
import { getRememberedSlideRoute } from "../navigation/lastSlideRoute.ts";
import type { KitTab } from "../navigation/router.ts";
import { navigate } from "../navigation/router.ts";
import { ComponentsTab } from "./ComponentsTab.tsx";
import { DocsHeader } from "./DocsHeader.tsx";
import { LayoutsTab } from "./LayoutsTab.tsx";
import { ThemeTab } from "./ThemeTab.tsx";

export type DocsViewProps = {
	tab?: KitTab;
	colorMode: ColorMode;
	onSetColorMode: (mode: ColorMode) => void;
};

export function DocsView({
	tab = "theme",
	colorMode,
	onSetColorMode,
}: DocsViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void tab;
		scrollRef.current?.scrollTo({ top: 0 });
	}, [tab]);

	useEffect(() => {
		const hotkeys: HotkeyDefinition[] = [
			{
				id: "docs.close",
				name: "Close reference pages",
				description:
					"Return from the runtime reference pages to the remembered slide.",
				keys: ["Escape"],
				handler: () => navigate(getRememberedSlideRoute()),
			},
		];

		return registerHotkeys(window, hotkeys);
	}, []);

	return (
		<div
			ref={scrollRef}
			className="fixed inset-0 overflow-auto bg-background text-foreground font-sans"
		>
			<DocsHeader
				tab={tab}
				colorMode={colorMode}
				onSetColorMode={onSetColorMode}
			/>

			<main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
				{tab === "layouts" ? (
					<LayoutsTab />
				) : tab === "components" ? (
					<ComponentsTab />
				) : (
					<ThemeTab />
				)}
			</main>
		</div>
	);
}
