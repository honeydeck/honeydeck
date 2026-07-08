import {
	Children,
	type CSSProperties,
	cloneElement,
	Fragment,
	isValidElement,
	type Key,
	type ReactElement,
	type ReactNode,
} from "react";
import { useTimeline } from "../timeline/TimelineContext.tsx";
import { Reveal } from "./Reveal.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RevealGroupListRevealMode = "direct" | "nested";

export type RevealGroupProps = {
	/**
	 * The step index for the first child. Subsequent children increment by 1.
	 * Injected by the remark step-numbering plugin; defaults to 1.
	 */
	at?: number;
	/**
	 * List reveal strategy. `"direct"` reveals only top-level list items;
	 * `"nested"` reveals nested list items depth-first.
	 */
	listRevealMode?: RevealGroupListRevealMode;
	/**
	 * Internal compiler-provided absolute steps for each direct reveal target.
	 * This lets nested timeline entries create gaps before later group targets.
	 */
	targetStepsJson?: string;
	/** Remove hidden children from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
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

function isListItemElement(child: ReactNode): child is ElementWithCommonProps {
	return isValidElement(child) && child.type === "li";
}

function isIntrinsicElementWithCommonProps(
	child: ReactNode,
): child is ElementWithCommonProps {
	return isValidElement(child) && typeof child.type === "string";
}

function isFragmentElement(child: ReactNode): child is ElementWithCommonProps {
	return isValidElement(child) && child.type === Fragment;
}

function isElementWithCommonProps(
	child: ReactNode,
): child is ElementWithCommonProps {
	return isValidElement(child);
}

function childKey(child: ReactNode, fallback: string): Key {
	return isValidElement(child) && child.key != null ? child.key : fallback;
}

function revealVisibility(
	stepIndex: number,
	at: number,
	showFutureSteps: boolean,
	futureStepOpacity: number,
	ephemeral: boolean,
): { shouldRender: boolean; style: CSSProperties } {
	const visible = stepIndex >= at;
	const previewFuture = !visible && showFutureSteps;

	return {
		shouldRender: visible || previewFuture || !ephemeral,
		style: {
			visibility: visible || previewFuture ? "visible" : "hidden",
			opacity: visible ? 1 : previewFuture ? futureStepOpacity : 0,
			transition: "opacity 300ms ease",
		},
	};
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
 * the slide step counter by the number of reveal targets. Set
 * `listRevealMode="nested"` to reveal nested list items depth-first. Nested
 * timeline entries can provide `targetStepsJson` so later group items keep the
 * correct absolute step positions.
 */
export function RevealGroup({
	at = 1,
	listRevealMode = "direct",
	targetStepsJson,
	ephemeral = false,
	children,
}: RevealGroupProps) {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const revealTargets = toMeaningfulArray(children);
	const targetSteps = parseTargetSteps(targetStepsJson);
	const revealNestedListItems = listRevealMode === "nested";
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

	function cloneRevealedElement(
		element: ElementWithCommonProps,
		elementAt: number,
		key: Key,
		childrenOverride?: ReactNode,
	): ReactNode {
		const { shouldRender, style } = revealVisibility(
			stepIndex,
			elementAt,
			showFutureSteps,
			futureStepOpacity,
			ephemeral,
		);

		if (!shouldRender) return null;

		return cloneElement(element, {
			key,
			style: {
				...element.props.style,
				...style,
			},
			...(childrenOverride === undefined ? {} : { children: childrenOverride }),
		});
	}

	function renderDirectListItem(listItem: ReactNode): ReactNode {
		const itemAt = nextTargetAt();
		const itemKey = childKey(listItem, `reveal-item-${itemAt}`);

		if (!isElementWithCommonProps(listItem)) {
			return (
				<Reveal key={itemKey} at={itemAt} ephemeral={ephemeral}>
					{listItem}
				</Reveal>
			);
		}

		return cloneRevealedElement(listItem, itemAt, itemKey);
	}

	function renderNestedListItem(listItem: ReactNode): ReactNode {
		if (!isListItemElement(listItem)) {
			return renderDirectListItem(listItem);
		}

		const itemAt = nextTargetAt();
		const itemKey = childKey(listItem, `reveal-item-${itemAt}`);

		return cloneRevealedElement(
			listItem,
			itemAt,
			itemKey,
			renderNestedListChildren(listItem.props.children),
		);
	}

	function renderNestedListChildren(listChildren: ReactNode): ReactNode {
		return Children.map(listChildren, (child) => {
			if (isListElement(child)) {
				return renderListElement(child);
			}

			if (
				(isIntrinsicElementWithCommonProps(child) ||
					isFragmentElement(child)) &&
				child.props.children !== undefined
			) {
				return cloneElement(child, {
					children: renderNestedListChildren(child.props.children),
				});
			}

			return child;
		});
	}

	function renderListElement(listElement: ElementWithCommonProps): ReactNode {
		const listItems = toMeaningfulArray(listElement.props.children);
		const listKey = childKey(listElement, `reveal-list-${at}-${targetIndex}`);
		const renderedListItems = listItems.map((listItem) =>
			revealNestedListItems
				? renderNestedListItem(listItem)
				: renderDirectListItem(listItem),
		);

		if (ephemeral && renderedListItems.every((item) => item === null)) {
			return null;
		}

		return cloneElement(listElement, {
			key: listKey,
			children: renderedListItems,
		});
	}

	return (
		<>
			{revealTargets.map((child) => {
				if (isListElement(child)) {
					return renderListElement(child);
				}

				const childAt = nextTargetAt();

				return (
					<Reveal
						key={childKey(child, `reveal-child-${childAt}`)}
						at={childAt}
						ephemeral={ephemeral}
					>
						{child}
					</Reveal>
				);
			})}
		</>
	);
}
