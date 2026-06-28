import { useTimeline } from "@honeydeck/honeydeck";
import {
	Children,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type Key,
	type ReactElement,
	type ReactNode,
} from "react";
import { Fade } from "./Fade.tsx";

type ElementWithCommonProps = ReactElement<{
	children?: ReactNode;
	className?: string;
	style?: CSSProperties;
}>;

export type FadeGroupProps = {
	/** The step index for the first child. Subsequent children increment by 1. */
	at?: number;
	/** Internal compiler-provided absolute steps for each direct fade target. */
	targetStepsJson?: string;
	/** Remove hidden children from the DOM/layout instead of reserving space. */
	ephemeral?: boolean;
	children?: ReactNode;
};

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

function fadeVisibility(
	stepIndex: number,
	at: number,
	showFutureSteps: boolean,
	futureStepOpacity: number,
	ephemeral: boolean,
): { shouldRender: boolean; style: CSSProperties } {
	const visible = stepIndex < at;
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

/** Fades each meaningful direct child out as a separate timeline step. */
export function FadeGroup({
	at = 1,
	targetStepsJson,
	ephemeral = false,
	children,
}: FadeGroupProps) {
	const { stepIndex, showFutureSteps, futureStepOpacity } = useTimeline();
	const fadeTargets = toMeaningfulArray(children);
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
			{fadeTargets.map((child, _index) => {
				if (isListElement(child)) {
					const listItems = toMeaningfulArray(child.props.children);
					const listKey = childKey(child, `fade-list-${at}-${targetIndex}`);
					const renderedListItems = listItems.map((listItem) => {
						const itemAt = nextTargetAt();
						const itemKey = childKey(listItem, `fade-item-${itemAt}`);

						if (!isElementWithCommonProps(listItem)) {
							return (
								<Fade key={itemKey} at={itemAt} ephemeral={ephemeral}>
									{listItem}
								</Fade>
							);
						}

						const { shouldRender, style } = fadeVisibility(
							stepIndex,
							itemAt,
							showFutureSteps,
							futureStepOpacity,
							ephemeral,
						);

						if (!shouldRender) return null;

						return cloneElement(listItem, {
							key: itemKey,
							style: {
								...listItem.props.style,
								...style,
							},
						});
					});

					if (ephemeral && renderedListItems.every((item) => item === null)) {
						return null;
					}

					return cloneElement(child, {
						key: listKey,
						children: renderedListItems,
					});
				}

				const childAt = nextTargetAt();

				return (
					<Fade
						key={childKey(child, `fade-child-${childAt}`)}
						at={childAt}
						ephemeral={ephemeral}
					>
						{child}
					</Fade>
				);
			})}
		</>
	);
}
