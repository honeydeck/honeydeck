import {
	type ColorMode,
	ColorModeCycleButton,
} from "@honeydeck/honeydeck/components";
import { MenuIcon, PackageIcon, XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { docsByGroup } from "../docs.js";
import { DexMascot } from "./DexMascot.js";
import { iconButtonClass } from "./styles.js";

export function Header({
	mode,
	onSetMode,
}: {
	mode: ColorMode;
	onSetMode: (mode: ColorMode) => void;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuId = useId();

	useEffect(() => {
		if (!menuOpen) return;

		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") setMenuOpen(false);
		}

		window.addEventListener("keydown", closeOnEscape);
		return () => window.removeEventListener("keydown", closeOnEscape);
	}, [menuOpen]);

	return (
		<header className="sticky top-0 z-30 border-b border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)]/90 backdrop-blur-xl">
			<nav
				className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
				aria-label="Main navigation"
			>
				<div className="flex min-w-0 items-center gap-3 lg:gap-7">
					<button
						type="button"
						className={`${iconButtonClass} lg:hidden`}
						aria-controls={menuId}
						aria-expanded={menuOpen}
						aria-label={
							menuOpen ? "Close navigation menu" : "Open navigation menu"
						}
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? (
							<XIcon size={18} aria-hidden="true" />
						) : (
							<MenuIcon size={18} aria-hidden="true" />
						)}
					</button>
					<Link
						to="/"
						className="flex min-w-0 items-center gap-3 font-black text-[color:var(--honeydeck-color-foreground)]"
						onClick={() => setMenuOpen(false)}
					>
						<DexMascot small />
						<span className="truncate">Honeydeck</span>
					</Link>
					<div className="hidden items-center gap-1 lg:flex">
						<NavItem to="/docs/getting-started">Docs</NavItem>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<GitHubLink className="hidden lg:inline-flex" />
					<ColorModeCycleButton
						className={iconButtonClass}
						colorMode={mode}
						onSetColorMode={onSetMode}
						iconSize={18}
					/>
				</div>
				<div
					id={menuId}
					className={`${menuOpen ? "grid" : "hidden"} absolute inset-x-4 top-[calc(100%+0.5rem)] max-h-[calc(100dvh-5.5rem)] gap-3 overflow-y-auto rounded-lg border border-[color:var(--honeydeck-color-border)] bg-[color:var(--honeydeck-color-background)] p-3 shadow-[0_18px_48px_var(--marketing-shadow)] sm:inset-x-6 lg:hidden`}
				>
					<div className="grid gap-1">
						<NavItem mobile to="/" onNavigate={() => setMenuOpen(false)}>
							Home
						</NavItem>
					</div>
					<DocsMenu onNavigate={() => setMenuOpen(false)} />
					<div className="grid gap-1 border-t border-[color:var(--honeydeck-color-border)] pt-2">
						<GitHubLink className="inline-flex rounded-lg px-3 py-2" />
						<a
							className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[color:var(--honeydeck-color-muted-foreground)] no-underline transition-colors hover:bg-[color:var(--honeydeck-color-surface)] hover:text-[color:var(--honeydeck-color-foreground)]"
							href="https://www.npmjs.com/package/@honeydeck/honeydeck"
						>
							npm <PackageIcon size={15} aria-hidden="true" />
						</a>
					</div>
				</div>
			</nav>
		</header>
	);
}

function DocsMenu({ onNavigate }: { onNavigate: () => void }) {
	return (
		<div className="grid gap-3">
			{[...docsByGroup()].map(([group, items]) => (
				<section key={group}>
					<h2 className="px-3 pb-1 text-xs font-black uppercase text-[color:var(--honeydeck-color-muted-foreground)]">
						{group}
					</h2>
					<div className="grid gap-1">
						{items.map((doc) => (
							<NavItem
								mobile
								to={doc.route}
								key={doc.slug}
								onNavigate={onNavigate}
							>
								{doc.title}
							</NavItem>
						))}
					</div>
				</section>
			))}
		</div>
	);
}

function GitHubLink({ className = "inline-flex" }: { className?: string }) {
	return (
		<a
			className={`${className} items-center gap-1.5 text-sm font-semibold text-[color:var(--honeydeck-color-muted-foreground)] no-underline transition-colors hover:text-[color:var(--honeydeck-color-foreground)]`}
			href="https://github.com/honeydeck/honeydeck"
			aria-label="Honeydeck on GitHub"
		>
			<span
				className="size-[18px] bg-current [mask-image:url('/github-mark.svg')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
				aria-hidden="true"
			/>
			<span>GitHub</span>
		</a>
	);
}

function NavItem({
	to,
	children,
	mobile = false,
	onNavigate,
}: {
	to: string;
	children: string;
	mobile?: boolean;
	onNavigate?: () => void;
}) {
	return (
		<NavLink
			className={({ isActive }) =>
				`${mobile ? "rounded-lg px-3 py-2" : "rounded-full px-3 py-2"} text-sm font-semibold transition ${isActive ? "bg-[color:var(--honeydeck-color-surface)] text-[color:var(--honeydeck-color-foreground)]" : "text-[color:var(--honeydeck-color-muted-foreground)] hover:bg-[color:var(--honeydeck-color-surface)] hover:text-[color:var(--honeydeck-color-foreground)]"}`
			}
			to={to}
			onClick={onNavigate}
		>
			{children}
		</NavLink>
	);
}

export function Footer() {
	return (
		<footer className="border-t border-[color:var(--honeydeck-color-border)] px-4 py-8 sm:px-6">
			<div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-[color:var(--honeydeck-color-muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
				<p>Honeydeck: fun, buzzing MDX Decks 🐝</p>
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
