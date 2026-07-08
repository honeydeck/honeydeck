import type { KeyedTokensInfo } from "@shikijs/magic-move/core";
import { ShikiMagicMovePrecompiled } from "@shikijs/magic-move/react";
import { useEffect, useMemo, useState } from "react";
import { useEffectiveColorMode } from "../color-mode/EffectiveColorModeContext.tsx";
import { useSlideScale } from "../deck/SlideScaleContext.tsx";
import { useTimeline } from "../timeline/TimelineContext.tsx";
import { CodeBlock } from "./CodeBlock.tsx";
import { parseJsonProp, type StepGroup } from "./CodeBlockShared.ts";

type HoneydeckMagicCodeBlockProps = {
	/** JSON-encoded unique build-time Shiki Magic Move token states for light mode. */
	lightTokenStatesJson: string;
	/** JSON-encoded unique build-time Shiki Magic Move token states for dark mode. */
	darkTokenStatesJson: string;
	/** JSON-encoded indexes from Magic Code timeline states to unique token states. */
	tokenStateIndexesJson: string;
	/** JSON-encoded StepGroup[] aligned to the Magic Code timeline states. */
	stepGroupsJson: string;
	/** JSON-encoded source strings aligned to the unique token states. */
	sourcesJson: string;
	/** 1-based timeline step where Magic Code state 1 activates. */
	startAt: number;
	/** Magic Move animation duration in milliseconds. */
	duration: number;
};

type MagicToken = KeyedTokensInfo["tokens"][number];

export function getActiveCodeStateIndex(
	stateCount: number,
	stepIndex: number,
	startAt: number,
): number {
	if (stateCount <= 1) return 0;
	if (startAt > 0 && stepIndex >= startAt) {
		return Math.min(stepIndex - startAt + 1, stateCount - 1);
	}
	return 0;
}

const MAGIC_CODE_TOKEN_OPACITY_VAR = "--honeydeck-magic-code-token-opacity";

function withMagicCodeTokenOpacity(
	token: MagicToken,
	opacity: string,
): MagicToken {
	return {
		...token,
		htmlStyle: {
			...token.htmlStyle,
			[MAGIC_CODE_TOKEN_OPACITY_VAR]: opacity,
		},
	};
}

export function applyMagicCodeDimming(
	step: KeyedTokensInfo,
	group: StepGroup | undefined,
): KeyedTokensInfo {
	let lineNumber = 1;
	return {
		...step,
		tokens: step.tokens.map((token) => {
			if (token.content === "\n") {
				lineNumber++;
				return token;
			}

			const opacity =
				!group || group === "all" || group.includes(lineNumber)
					? "1"
					: "var(--honeydeck-code-line-dim-opacity)";
			return withMagicCodeTokenOpacity(token, opacity);
		}),
	};
}

function applyMagicCodeStepDimming(
	steps: KeyedTokensInfo[],
	groups: StepGroup[],
): KeyedTokensInfo[] {
	return steps.map((step, index) => applyMagicCodeDimming(step, groups[index]));
}

export function isPdfExportRender(): boolean {
	if (typeof window === "undefined") return false;

	const params = new URLSearchParams(window.location.search);
	return params.has("honeydeckPdfRender");
}

export function getMagicCodeTransitionOptions(
	duration: number,
	slideScale: number,
	animate = true,
) {
	return {
		duration,
		lineNumbers: false,
		animateContainer: animate,
		easing: "ease-in",
		delayMove: 0,
		delayEnter: 0,
		delayLeave: 0,
		delayContainer: 0,
		// Honeydeck scales slides with CSS transforms; Shiki needs that scale so
		// measured viewport pixels map back to slide-local CSS pixels.
		globalScale: slideScale > 0 ? slideScale : 1,
	};
}

/** Renders a build-time precompiled Shiki Magic Move code block. */
export function HoneydeckMagicCodeBlock({
	lightTokenStatesJson,
	darkTokenStatesJson,
	tokenStateIndexesJson,
	stepGroupsJson,
	sourcesJson,
	startAt,
	duration,
}: HoneydeckMagicCodeBlockProps) {
	const { stepIndex } = useTimeline();
	const slideScale = useSlideScale();
	const colorMode = useEffectiveColorMode();
	const isPdfExport = isPdfExportRender();
	const [isBaselineReady, setIsBaselineReady] = useState(isPdfExport);

	useEffect(() => {
		if (isPdfExport) {
			setIsBaselineReady(true);
			return;
		}

		let firstFrame = 0;
		let secondFrame = 0;
		firstFrame = window.requestAnimationFrame(() => {
			secondFrame = window.requestAnimationFrame(() =>
				setIsBaselineReady(true),
			);
		});

		return () => {
			window.cancelAnimationFrame(firstFrame);
			window.cancelAnimationFrame(secondFrame);
		};
	}, [isPdfExport]);

	const tokenStateIndexes = useMemo(
		() =>
			parseJsonProp<number[]>(
				tokenStateIndexesJson,
				[],
				"tokenStateIndexesJson",
			),
		[tokenStateIndexesJson],
	);
	const stepGroups = useMemo(
		() => parseJsonProp<StepGroup[]>(stepGroupsJson, [], "stepGroupsJson"),
		[stepGroupsJson],
	);
	const sources = useMemo(
		() => parseJsonProp<string[]>(sourcesJson, [], "sourcesJson"),
		[sourcesJson],
	);
	const tokenStates = useMemo(
		() =>
			parseJsonProp<KeyedTokensInfo[]>(
				colorMode === "dark" ? darkTokenStatesJson : lightTokenStatesJson,
				[],
				colorMode === "dark" ? "darkTokenStatesJson" : "lightTokenStatesJson",
			),
		[colorMode, darkTokenStatesJson, lightTokenStatesJson],
	);

	const rawSteps = useMemo(
		() =>
			tokenStateIndexes.flatMap((index) => {
				const state = tokenStates[index];
				return state ? [state] : [];
			}),
		[tokenStateIndexes, tokenStates],
	);
	const dimmedSteps = useMemo(
		() => applyMagicCodeStepDimming(rawSteps, stepGroups),
		[rawSteps, stepGroups],
	);
	const activeStateIndex = getActiveCodeStateIndex(
		dimmedSteps.length,
		stepIndex,
		startAt,
	);
	const [renderedStateIndex, setRenderedStateIndex] =
		useState(activeStateIndex);

	useEffect(() => {
		if (!isBaselineReady) return;
		setRenderedStateIndex(activeStateIndex);
	}, [activeStateIndex, isBaselineReady]);

	const visibleStateIndex = Math.min(
		renderedStateIndex,
		Math.max(0, dimmedSteps.length - 1),
	);
	const source =
		sources[tokenStateIndexes[visibleStateIndex] ?? visibleStateIndex];
	const transitionOptions = useMemo(
		() => getMagicCodeTransitionOptions(duration, slideScale, !isPdfExport),
		[duration, isPdfExport, slideScale],
	);

	if (dimmedSteps.length === 0) return null;

	return (
		<CodeBlock source={source} className="honeydeck-magic-code-block">
			<ShikiMagicMovePrecompiled
				steps={dimmedSteps}
				step={visibleStateIndex}
				animate={!isPdfExport}
				options={transitionOptions}
			/>
		</CodeBlock>
	);
}
