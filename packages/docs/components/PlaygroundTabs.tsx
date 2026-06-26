"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PlaygroundTabOption<TValue extends number | string> = {
	label: ReactNode;
	value: TValue;
};

export type PlaygroundTabsProps<TValue extends number | string> = {
	ariaLabel: string;
	className?: string;
	onValueChange: (value: TValue) => void;
	options: readonly PlaygroundTabOption<TValue>[];
	value: TValue;
};

export function PlaygroundTabs<TValue extends number | string>({
	ariaLabel,
	className,
	onValueChange,
	options,
	value,
}: PlaygroundTabsProps<TValue>) {
	const activeIndex = Math.max(
		0,
		options.findIndex((option) => option.value === value),
	);

	function moveSelection(event: KeyboardEvent<HTMLDivElement>, index: number) {
		const nextOption = options[index];
		if (!nextOption) return;

		event.preventDefault();
		onValueChange(nextOption.value);

		const tabs =
			event.currentTarget.querySelectorAll<HTMLElement>("[role='tab']");
		tabs[index]?.focus();
	}

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (options.length === 0) return;

		if (event.key === "ArrowRight" || event.key === "ArrowDown") {
			moveSelection(event, (activeIndex + 1) % options.length);
			return;
		}

		if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
			moveSelection(event, (activeIndex - 1 + options.length) % options.length);
			return;
		}

		if (event.key === "Home") {
			moveSelection(event, 0);
			return;
		}

		if (event.key === "End") {
			moveSelection(event, options.length - 1);
		}
	}

	return (
		<div
			aria-label={ariaLabel}
			className={cn(
				"inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[color:var(--honeydeck-color-border)] bg-[color:color-mix(in_oklab,var(--honeydeck-color-foreground)_5%,var(--honeydeck-color-background))] p-1 shadow-sm",
				className,
			)}
			onKeyDown={onKeyDown}
			role="tablist"
		>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<button
						aria-selected={selected}
						className={cn(
							"shrink-0 rounded-full px-3 py-1.5 text-sm font-black transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--honeydeck-color-primary)]",
							selected
								? "bg-[color:var(--honeydeck-color-primary)] text-[color:var(--honeydeck-color-primary-foreground)] shadow-sm"
								: "text-[color:var(--honeydeck-color-muted-foreground)] hover:bg-[color:var(--honeydeck-color-background)] hover:text-[color:var(--honeydeck-color-foreground)]",
						)}
						key={String(option.value)}
						onClick={() => onValueChange(option.value)}
						role="tab"
						tabIndex={selected || (activeIndex === 0 && index === 0) ? 0 : -1}
						type="button"
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
