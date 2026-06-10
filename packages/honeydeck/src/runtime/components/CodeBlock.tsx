/**
 * HoneydeckCodeBlock — runtime code block component with syntax highlighting
 * and timeline-driven step-through.
 *
 * ### Usage
 * This component is **not imported directly by slide authors**. The
 * `remarkShikiCodeBlocks` remark plugin automatically replaces fenced code
 * blocks in MDX with `<HoneydeckCodeBlock>` elements at compile time.
 *
 * ### Props
 * - `html`       — Pre-highlighted HTML string from shiki (full `<pre>…</pre>`).
 * - `stepsJson`  — JSON-encoded `StepGroup[]` (e.g. `[[2],[4,5],"all"]`).
 *                  Empty array = no step-through.
 * - `startAt`    — 1-based timeline step at which group 1 activates.
 *                  Group 0 is the baseline active highlight; 0 for non-stepped blocks.
 * - `source`     — Original fenced code text for clipboard copying.
 *
 * ### Step-through mechanics
 * The component reads `stepIndex` from `useTimeline()` and computes the active
 * group index: group 0 before `startAt`, then later groups from `startAt`.
 * It then adds `data-dim="1"` and an inline opacity style to non-highlighted
 * `.line` spans in the rendered HTML.
 * Base CSS also targets the attribute as a fallback.
 *
 * The highlighted HTML is injected via `dangerouslySetInnerHTML`, so the
 * step-specific `data-dim` attributes are computed as part of the HTML string
 * before React writes it to the DOM.
 */

import { CheckIcon, CopyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTimeline } from "../TimelineContext.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single step-through group: line numbers (1-based) or 'all'. */
export type StepGroup = number[] | "all";

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
const LINE_SPAN = /<span\b([^>]*)>/g;
const LINE_CLASS = /\bclass=(["'])[^"']*\bline\b[^"']*\1/;
const DATA_LINE = /\bdata-line=(["'])(\d+)\1/;
const STYLE_ATTR = /\sstyle=(["'])(.*?)\1/g;
const DIM_STYLE_DECL = "opacity: var(--honeydeck-code-line-dim-opacity);";

async function writeClipboardText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall back to the textarea path below.
	}

	try {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.inset = "0";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const didCopy = document.execCommand("copy");
		document.body.removeChild(textarea);
		return didCopy;
	} catch {
		return false;
	}
}

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
	const cleanHtml = removeDimStyle(html.replace(DATA_DIM_ATTR, ""));

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
		if (activeGroup.includes(lineNumber)) return match;

		return `<span${addDimAttributes(attrs)}>`;
	});
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a pre-highlighted code block and applies timeline-driven line
 * dimming for step-through walkthroughs.
 *
 * Export name matches the identifier injected by `remarkShikiCodeBlocks`:
 * `import { HoneydeckCodeBlock } from '@honeydeck/honeydeck/components/code-block'`
 */
export function HoneydeckCodeBlock({
	html,
	stepsJson,
	startAt,
	source,
}: HoneydeckCodeBlockProps) {
	const { stepIndex } = useTimeline();
	const [copied, setCopied] = useState(false);

	// Parse step groups once (stepsJson is static — set at compile time)
	const steps = useMemo((): StepGroup[] => {
		try {
			return JSON.parse(stepsJson) as StepGroup[];
		} catch {
			return [];
		}
	}, [stepsJson]);

	const dimmedHtml = useMemo(
		() => applyCodeStepDimming(html, steps, stepIndex, startAt),
		[html, startAt, stepIndex, steps],
	);

	async function copySource() {
		if (!source) return;

		if (await writeClipboardText(source)) {
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		}
	}

	return (
		<div className="honeydeck-code-block group relative mb-[0.75em] overflow-hidden rounded-honeydeck font-mono text-[length:var(--honeydeck-font-size-code)] [&_.line]:transition-opacity [&_.line]:duration-150 [&_.line]:ease-in">
			{source ? (
				<button
					className="honeydeck-code-copy-button"
					type="button"
					aria-label={copied ? "Code copied" : "Copy code"}
					title={copied ? "Copied" : "Copy code"}
					onClick={copySource}
				>
					{copied ? (
						<CheckIcon aria-hidden="true" />
					) : (
						<CopyIcon aria-hidden="true" />
					)}
				</button>
			) : null}
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki generates this highlighted HTML during MDX compilation.
				dangerouslySetInnerHTML={{ __html: dimmedHtml }}
			/>
		</div>
	);
}
