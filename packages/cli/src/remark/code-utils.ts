/** Shared helpers for Honeydeck fenced code and Magic Code remark transforms. */

import type { Code } from "mdast";

/** A single step-through group: either an array of 1-based line numbers or 'all'. */
export type StepGroup = number[] | "all";

export type ParsedCodeFence = {
	lang: string;
	meta: string | null;
	value: string;
};

export type MagicCodeDurationResult =
	| { ok: true; duration: number }
	| { ok: false; message: string };

export const DEFAULT_MAGIC_CODE_DURATION = 800;

/** Parse a code fence meta string like `{2|4-5|all}` into step groups. */
export function parseStepMeta(meta: string | null | undefined): StepGroup[] {
	if (!meta) return [];

	const match = meta.match(/\{([^}]+)\}/);
	if (!match?.[1]) return [];

	const groupStrings = match[1].split("|").filter(Boolean);
	if (groupStrings.length === 0) return [];

	return groupStrings.map((group): StepGroup => {
		const trimmed = group.trim();
		if (trimmed === "all") return "all";

		const lines: number[] = [];
		for (const part of trimmed.split(",")) {
			const dashIdx = part.indexOf("-");
			if (dashIdx !== -1) {
				const start = parseInt(part.slice(0, dashIdx).trim(), 10);
				const end = parseInt(part.slice(dashIdx + 1).trim(), 10);
				if (!Number.isNaN(start) && !Number.isNaN(end)) {
					for (let i = start; i <= end; i++) lines.push(i);
				}
			} else {
				const n = parseInt(part.trim(), 10);
				if (!Number.isNaN(n)) lines.push(n);
			}
		}
		return lines;
	});
}

export function codeFenceGroups(meta: string | null | undefined): StepGroup[] {
	const steps = parseStepMeta(meta);
	return steps.length > 0 ? steps : ["all"];
}

export function countCodeFenceGroups(meta: string | null | undefined): number {
	if (!meta) return 0;
	const match = meta.match(/\{([^}]+)\}/);
	if (!match?.[1]) return 0;
	return match[1].split("|").filter(Boolean).length;
}

export function countCodeFenceSteps(meta: string | null | undefined): number {
	return Math.max(0, countCodeFenceGroups(meta) - 1);
}

export function isMagicCodeFence(node: Code): boolean {
	if (node.lang !== "md") return false;
	const firstMetaToken = node.meta?.trim().split(/\s+/)[0];
	return firstMetaToken === "magic-code" || firstMetaToken === "magic-move";
}

export function parseMagicCodeDuration(
	meta: string | null | undefined,
	deckDefault: unknown,
): MagicCodeDurationResult {
	const fallback =
		typeof deckDefault === "number" &&
		Number.isFinite(deckDefault) &&
		deckDefault >= 0
			? deckDefault
			: DEFAULT_MAGIC_CODE_DURATION;

	const match = meta?.match(/\{\s*duration\s*:\s*([^}]+)\}/);
	if (!match?.[1]) return { ok: true, duration: fallback };

	const raw = match[1].trim();
	const duration = Number(raw);
	if (!Number.isFinite(duration) || duration < 0) {
		return {
			ok: false,
			message: `Honeydeck Magic Code duration must be a non-negative number of milliseconds, got ${JSON.stringify(raw)}.`,
		};
	}

	return { ok: true, duration };
}

function splitFenceInfo(info: string): { lang: string; meta: string | null } {
	const trimmed = info.trim();
	if (!trimmed) return { lang: "text", meta: null };

	const firstSpace = trimmed.search(/\s/);
	if (firstSpace === -1) return { lang: trimmed, meta: null };

	return {
		lang: trimmed.slice(0, firstSpace),
		meta: trimmed.slice(firstSpace).trim() || null,
	};
}

/** Parse fenced code blocks inside an outer Markdown code fence. */
export function parseInnerCodeFences(markdown: string): ParsedCodeFence[] {
	const lines = markdown.split(/\r?\n/);
	const fences: ParsedCodeFence[] = [];

	for (let i = 0; i < lines.length; i++) {
		const opener = lines[i]?.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
		if (!opener?.[1]) continue;

		const marker = opener[1][0];
		const length = opener[1].length;
		const { lang, meta } = splitFenceInfo(opener[2] ?? "");
		const body: string[] = [];
		i++;

		for (; i < lines.length; i++) {
			const closer = lines[i]?.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
			if (
				closer?.[1] &&
				closer[1][0] === marker &&
				closer[1].length >= length
			) {
				break;
			}
			body.push(lines[i] ?? "");
		}

		fences.push({ lang, meta, value: body.join("\n") });
	}

	return fences;
}

export function countMagicCodeStates(markdown: string): number {
	return parseInnerCodeFences(markdown).reduce(
		(total, fence) => total + codeFenceGroups(fence.meta).length,
		0,
	);
}
