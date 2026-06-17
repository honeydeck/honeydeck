import {
	Children,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type Key,
	type ReactElement,
	type ReactNode,
} from "react";
import { useTimeline } from "../TimelineContext.tsx";
import { Reveal } from "./Reveal.tsx";
import { getTimelineRevealStyle } from "./TimelineReveal.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevealGroupProps = {
	/**
	 * The step index for the first child. Subsequent children increment by 1.
	 * Injected by the remark step-numbering plugin; defaults to 1.
	 */
	at?: number;
	/**
	 * Internal compiler-provided absolute steps for each direct reveal target.
	 * This lets nested timeline entries create gaps before later group targets.
	 */
	targetStepsJson?: string;
	children?: ReactNode;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ElementWithCommonProps = ReactElement<{
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
}>;

function isMeaningfulReactChild(child: ReactNode): boolean {
	return typeof child === "string" ? child.trim().length > 0 : child !== null;
}

function toMeaningfulArray(children: ReactNode): ReactNode[] {
	return Children.toArray(children).filter(isMeaningfulReactChild);
}

function isListElement(child: ReactNode): child is ElementWithCommonProps {
	return (
		isValidElement(child) &&
		typeof child.type === "string" &&
		(child.type === "ul" || child.type === "ol")
	);
}

function isElementWithCommonProps(
	child: ReactNode,
): child is ElementWithCommonProps {
	return isValidElement(child);
}

function childKey(child: ReactNode, fallback: string): Key {
	return isValidElement(child) && child.key != null ? child.key : fallback;
}

function revealStyle(
	stepIndex: number,
	at: number,
	showFutureSteps: boolean,
	futureStepOpacity: number,
): CSSProperties {
	return getTimelineRevealStyle({
		stepIndex,
		at,
		showFutureSteps,
		futureStepOpacity,
	});
}

function parseTargetSteps(targetStepsJson: string | undefined): number[] {
	if (!targetStepsJson) return [];

	try {
		const parsed = JSON.parse(targetStepsJson) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((value): value is number => typeof value === "number");
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reveals each meaningful direct child as a separate timeline step.
 *
 * Use `RevealGroup` when a short sequence should appear one item at a time.
 * Direct Markdown lists are preserved as lists, while each list item gets its
 * own reveal step.
 *
 * ```mdx
 * import { RevealGroup } from '@honeydeck/honeydeck'
 *
 * <RevealGroup>
 *   - First point
 *   - Second point
 *   - Third point
 * </RevealGroup>
 * ```
 *
 * Honeydeck assigns the starting `at` value during MDX compilation and advances
 * the slide step counter by the number of reveal targets. Nested timeline
 * entries can provide `targetStepsJson` so later group items keep the correct
 * absolute step positions.
 */
export function RevealGroup({
	at = 1,
	targetStepsJson,
	children,
}: RevealGroupProps) {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const revealTargets = toMeaningfulArray(children);
	const targetSteps = parseTargetSteps(targetStepsJson);
	let targetIndex = 0;
	let nextAt = at;

	function nextTargetAt(): number {
		const explicitAt = targetSteps[targetIndex];
		targetIndex++;

		if (explicitAt !== undefined) {
			nextAt = Math.max(nextAt, explicitAt + 1);
			return explicitAt;
		}

		const fallbackAt = nextAt;
		nextAt++;
		return fallbackAt;
	}

	return (
		<>
			{revealTargets.map((child, _index) => {
				if (isListElement(child)) {
					const listItems = toMeaningfulArray(child.props.children);
					const listKey = childKey(child, `reveal-list-${at}-${targetIndex}`);

					return cloneElement(child, {
						key: listKey,
						children: listItems.map((listItem) => {
							const itemAt = nextTargetAt();
							const itemKey = childKey(listItem, `reveal-item-${itemAt}`);

							if (!isElementWithCommonProps(listItem)) {
								return (
									<Reveal key={itemKey} at={itemAt}>
										{listItem}
									</Reveal>
								);
							}

							return cloneElement(listItem, {
								key: itemKey,
								style: {
									...listItem.props.style,
									...revealStyle(
										stepIndex,
										itemAt,
										showFutureSteps,
										futureStepOpacity,
									),
								},
							});
						}),
					});
				}

				const childAt = nextTargetAt();

				return (
					<Reveal key={childKey(child, `reveal-child-${childAt}`)} at={childAt}>
						{child}
					</Reveal>
				);
			})}
		</>
	);
}
