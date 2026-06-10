/**
 * DocsView — built-in runtime reference for the active Honeydeck setup.
 *
 * Routes:
 *   /#/theme
 *   /#/layouts
 *   /#/components
 */

import { useEffect, useRef } from "react";
import type { ColorMode } from "../components/ColorModeCycleButton.tsx";
import { isEditableKeyboardTarget } from "../keyboardTarget.ts";
import { getRememberedSlideRoute } from "../lastSlideRoute.ts";
import type { KitTab } from "../router.ts";
import { navigate } from "../router.ts";
import { ComponentsTab } from "./docs/ComponentsTab.tsx";
import { DocsHeader } from "./docs/DocsHeader.tsx";
import { LayoutsTab } from "./docs/LayoutsTab.tsx";
import { ThemeTab } from "./docs/ThemeTab.tsx";

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
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			if (isEditableKeyboardTarget(event.target)) return;

			event.preventDefault();
			navigate(getRememberedSlideRoute());
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
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
