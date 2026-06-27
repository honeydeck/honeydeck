import { useMemo } from "react";
import { useTimeline } from "../TimelineContext.tsx";
import { CodeBlock } from "./CodeBlock.tsx";
import { parseJsonProp, type StepGroup } from "./CodeBlockShared.ts";

type HoneydeckCodeBlockProps = {
	/** Full shiki HTML output (includes the `<pre>` element). */
	html: string;
	/** JSON-encoded StepGroup[] — empty array = no step-through. */
	stepsJson: string;
	/** 1-based timeline step where group 1 activates (0 = no step-through). */
	startAt: number;
	/** Original fenced code text copied by the hover/focus copy control. */
	source?: string;
};

const DATA_DIM_ATTR = /\sdata-dim=(["'])1\1/g;
const DATA_HIGHLIGHT_ATTR = /\sdata-highlight=(["'])1\1/g;
const LINE_SPAN = /<span\b([^>]*)>/g;
const LINE_CLASS = /\bclass=(["'])[^"']*\bline\b[^"']*\1/;
const DATA_LINE = /\bdata-line=(["'])(\d+)\1/;
const STYLE_ATTR = /\sstyle=(["'])(.*?)\1/g;
const DIM_STYLE_DECL = "opacity: var(--honeydeck-code-line-dim-opacity);";

function removeDimStyle(html: string): string {
	return html.replace(STYLE_ATTR, (match, quote: string, style: string) => {
		if (!style.includes(DIM_STYLE_DECL)) return match;

		const cleanedStyle = style
			.replace(DIM_STYLE_DECL, "")
			.replace(/\s{2,}/g, " ")
			.trim();

		return cleanedStyle ? ` style=${quote}${cleanedStyle}${quote}` : "";
	});
}

function addHighlightAttributes(attrs: string): string {
	return `${attrs} data-highlight="1"`;
}

function addDimAttributes(attrs: string): string {
	if (attrs.includes(DIM_STYLE_DECL)) return `${attrs} data-dim="1"`;

	const withStyle = attrs.replace(
		STYLE_ATTR,
		(_match, quote: string, style: string) =>
			` style=${quote}${style.trim()}${style.trim().endsWith(";") ? "" : ";"} ${DIM_STYLE_DECL}${quote}`,
	);

	if (withStyle !== attrs) return `${withStyle} data-dim="1"`;

	return `${attrs} data-dim="1" style="${DIM_STYLE_DECL}"`;
}

export function applyCodeStepDimming(
	html: string,
	steps: StepGroup[],
	stepIndex: number,
	startAt: number,
): string {
	const cleanHtml = removeDimStyle(
		html.replace(DATA_DIM_ATTR, "").replace(DATA_HIGHLIGHT_ATTR, ""),
	);

	if (steps.length === 0) return cleanHtml;

	let activeGroupIndex = 0;
	if (startAt > 0 && stepIndex >= startAt) {
		activeGroupIndex = Math.min(stepIndex - startAt + 1, steps.length - 1);
	}

	const activeGroup = steps[activeGroupIndex];
	if (!activeGroup || activeGroup === "all") return cleanHtml;

	return cleanHtml.replace(LINE_SPAN, (match, attrs: string) => {
		if (!LINE_CLASS.test(attrs)) return match;

		const dataLine = attrs.match(DATA_LINE);
		if (!dataLine) return match;

		const lineNumber = parseInt(dataLine[2] ?? "", 10);
		if (activeGroup.includes(lineNumber)) {
			return `<span${addHighlightAttributes(attrs)}>`;
		}

		return `<span${addDimAttributes(attrs)}>`;
	});
}

/**
 * Renders a pre-highlighted code block and applies timeline-driven line
 * dimming for step-through walkthroughs.
 *
 * Export name matches the identifier injected by `remarkShikiCodeBlocks`:
 * `import { HoneydeckCodeBlock } from '@honeydeck/runtime/components/code-block/normal'`
 */
export function HoneydeckCodeBlock({
	html,
	stepsJson,
	startAt,
	source,
}: HoneydeckCodeBlockProps) {
	const { stepIndex } = useTimeline();

	// Parse step groups once (stepsJson is static — set at compile time)
	const steps = useMemo(
		() => parseJsonProp<StepGroup[]>(stepsJson, []),
		[stepsJson],
	);

	const dimmedHtml = useMemo(
		() => applyCodeStepDimming(html, steps, stepIndex, startAt),
		[html, startAt, stepIndex, steps],
	);

	return (
		<CodeBlock
			source={source}
			className="[&_.line]:transition-opacity [&_.line]:duration-150 [&_.line]:ease-in"
		>
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki generates this highlighted HTML during MDX compilation.
				dangerouslySetInnerHTML={{ __html: dimmedHtml }}
			/>
		</CodeBlock>
	);
}
