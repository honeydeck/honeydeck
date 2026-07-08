import { ExternalLinkIcon } from "lucide-react";
import {
	type ColorMode,
	ColorModeCycleButton,
} from "../deck/chrome/ColorModeCycleButton.tsx";
import { getRememberedSlideRoute } from "../navigation/lastSlideRoute.ts";
import type { KitTab } from "../navigation/router.ts";
import { navigate } from "../navigation/router.ts";

export type DocsHeaderProps = {
	tab: KitTab;
	colorMode: ColorMode;
	onSetColorMode: (mode: ColorMode) => void;
};

function tabClass(active: boolean): string {
	return active
		? "border-primary text-foreground"
		: "border-transparent text-foreground/55 hover:text-foreground";
}

export function DocsHeader({
	tab,
	colorMode,
	onSetColorMode,
}: DocsHeaderProps) {
	return (
		<header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
			<div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
				<div>
					<div className="text-lg font-semibold tracking-tight">
						Honeydeck Reference
					</div>
					<div className="text-xs text-foreground/50">/#/theme</div>
				</div>

				<nav
					className="flex flex-wrap gap-x-6 gap-y-1"
					aria-label="Docs reference sections"
				>
					<button
						type="button"
						onClick={() =>
							navigate({ view: "kit", slide: 1, step: 0, kitTab: "theme" })
						}
						className={`border-b-2 py-2 text-sm font-medium ${tabClass(tab === "theme")}`}
					>
						Theme tokens
					</button>
					<button
						type="button"
						onClick={() =>
							navigate({ view: "kit", slide: 1, step: 0, kitTab: "layouts" })
						}
						className={`border-b-2 py-2 text-sm font-medium ${tabClass(tab === "layouts")}`}
					>
						Layouts
					</button>
					<button
						type="button"
						onClick={() =>
							navigate({
								view: "kit",
								slide: 1,
								step: 0,
								kitTab: "components",
							})
						}
						className={`border-b-2 py-2 text-sm font-medium ${tabClass(tab === "components")}`}
					>
						Components
					</button>
				</nav>

				<div className="flex items-center gap-4">
					<a
						href="https://honeydeck.dev"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/65 underline underline-offset-4 hover:text-foreground"
					>
						Docs
						<ExternalLinkIcon aria-hidden="true" size={14} />
					</a>
					<ColorModeCycleButton
						colorMode={colorMode}
						onSetColorMode={onSetColorMode}
						className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-background text-foreground"
					/>
					<button
						type="button"
						onClick={() => navigate(getRememberedSlideRoute())}
						className="rounded-sm border border-border bg-surface px-3 py-1.5 text-sm font-medium text-surface-foreground hover:border-primary/50 hover:bg-primary/10 hover:text-foreground"
					>
						Back to slides
					</button>
				</div>
			</div>
		</header>
	);
}
