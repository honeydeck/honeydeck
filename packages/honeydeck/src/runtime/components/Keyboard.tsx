import { Children, type ReactNode } from "react";

export type KeyboardKey = ReactNode;

export type KeyboardProps = {
	/** Key label or ordered shortcut key labels. */
	keys?: KeyboardKey | readonly KeyboardKey[];
	/** Single key label when `keys` is omitted. */
	children?: ReactNode;
	/** Separator rendered between array entries. */
	separator?: ReactNode;
	/** Additional CSS class for the outer element. */
	className?: string;
};

function cn(...classes: (string | undefined | false)[]): string | undefined {
	const value = classes.filter(Boolean).join(" ");
	return value || undefined;
}

function renderKey(key: KeyboardKey): ReactNode {
	return (
		<kbd className="honeydeck-keyboard-key inline-flex min-w-[1.6em] items-center justify-center rounded-[0.28em] border border-b-[0.14em] border-border bg-surface px-[0.42em] pt-[0.18em] pb-[0.14em] font-mono text-[1em] font-semibold leading-none text-surface-foreground">
			{key}
		</kbd>
	);
}

/**
 * Displays one keyboard key or an ordered keyboard shortcut in slide prose.
 *
 * Use `children` for a single inline key label. Use `keys` with an array for
 * ordered shortcuts, and change `separator` when the default `+` is too noisy
 * for the shortcut style.
 *
 * ```mdx
 * import { Keyboard } from '@honeydeck/honeydeck'
 *
 * Press <Keyboard>Esc</Keyboard> to close overview.
 *
 * Open command palette with <Keyboard keys={["Ctrl", "Shift", "P"]} />.
 *
 * Advance with <Keyboard keys="Space" />.
 * ```
 */
export function Keyboard({
	keys,
	children,
	separator = "+",
	className,
}: KeyboardProps) {
	const value = keys ?? children;

	if (Array.isArray(value)) {
		return (
			<span
				className={cn(
					"honeydeck-keyboard inline-flex items-baseline whitespace-nowrap align-baseline text-[0.82em] leading-none",
					className,
				)}
			>
				{Children.map(value, (key, index) => (
					<span className="honeydeck-keyboard-part inline-flex items-center">
						{index > 0 && (
							<span className="honeydeck-keyboard-separator mx-[0.25em] font-body font-semibold text-surface-foreground opacity-[0.72]">
								{separator}
							</span>
						)}
						{renderKey(key)}
					</span>
				))}
			</span>
		);
	}

	return (
		<kbd
			className={cn(
				"honeydeck-keyboard inline-flex items-baseline whitespace-nowrap align-baseline text-[0.82em] leading-none",
				"honeydeck-keyboard-key min-w-[1.6em] justify-center rounded-[0.28em] border border-b-[0.14em] border-border bg-surface px-[0.42em] pt-[0.18em] pb-[0.14em] font-mono text-[1em] font-semibold text-surface-foreground",
				className,
			)}
		>
			{value}
		</kbd>
	);
}
