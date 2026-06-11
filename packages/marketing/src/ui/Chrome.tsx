import {
	type ColorMode,
	ColorModeCycleButton,
} from "@honeydeck/honeydeck/components";
import { PackageIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { DexMascot } from "./DexMascot.js";
import { iconButtonClass } from "./styles.js";

export function Header({
	mode,
	onSetMode,
}: {
	mode: ColorMode;
	onSetMode: (mode: ColorMode) => void;
}) {
	return (
		<header className="sticky top-0 z-30 border-b border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)]/90 backdrop-blur-xl">
			<nav
				className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6"
				aria-label="Main navigation"
			>
				<div className="flex items-center gap-7">
					<Link
						to="/"
						className="flex items-center gap-3 font-black text-[color:var(--honeydeck-color-foreground)]"
					>
						<DexMascot small />
						<span>Honeydeck</span>
					</Link>
					<NavItem to="/docs/getting-started">Docs</NavItem>
				</div>
				<div className="flex items-center gap-2">
					<a
						className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--honeydeck-color-muted-foreground)] no-underline transition-colors hover:text-[color:var(--honeydeck-color-foreground)]"
						href="https://github.com/honeydeck/honeydeck"
						aria-label="Honeydeck on GitHub"
					>
						<span
							className="size-[18px] bg-current [mask-image:url('/github-mark.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
							aria-hidden="true"
						/>
						<span>GitHub</span>
					</a>
					<ColorModeCycleButton
						className={iconButtonClass}
						colorMode={mode}
						onSetColorMode={onSetMode}
						iconSize={18}
					/>
				</div>
			</nav>
		</header>
	);
}

function NavItem({ to, children }: { to: string; children: string }) {
	return (
		<NavLink
			className={({ isActive }) =>
				`rounded-full px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-[color:var(--honeydeck-color-surface)] text-[color:var(--honeydeck-color-foreground)]" : "text-[color:var(--honeydeck-color-muted-foreground)] hover:text-[color:var(--honeydeck-color-foreground)]"}`
			}
			to={to}
		>
			{children}
		</NavLink>
	);
}

export function Footer() {
	return (
		<footer className="border-t border-[color:var(--honeydeck-color-border)] px-4 py-8 sm:px-6">
			<div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[color:var(--honeydeck-color-muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
				<p>Honeydeck: Deck Experience for MDX and React slides.</p>
				<div className="flex flex-wrap gap-4">
					<a href="/llms.txt">llms.txt</a>
					<a href="/llms-full.txt">llms-full.txt</a>
					<a href="https://www.npmjs.com/package/@honeydeck/honeydeck">
						npm <PackageIcon className="inline" size={14} aria-hidden="true" />
					</a>
				</div>
			</div>
		</footer>
	);
}
