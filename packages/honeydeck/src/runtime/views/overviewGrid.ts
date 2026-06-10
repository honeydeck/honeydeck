/**
 * Helpers for overview-grid keyboard navigation.
 *
 * Arrow up/down must follow the grid the browser actually rendered. This keeps
 * keyboard movement aligned with CSS after first layout and after resizes.
 */

export function countGridColumnsFromChildren(children: HTMLCollection): number {
	const firstChild = children.item(0) as HTMLElement | null;
	if (!firstChild) return 0;

	const firstRowTop = firstChild.offsetTop;
	let columns = 0;

	for (const child of Array.from(children) as HTMLElement[]) {
		if (Math.abs(child.offsetTop - firstRowTop) > 1) break;
		columns += 1;
	}

	return columns;
}

export function countGridTemplateColumns(templateColumns: string): number {
	const trimmed = templateColumns.trim();
	if (!trimmed || trimmed === "none") return 0;

	let depth = 0;
	let count = 0;
	let inTrack = false;

	for (const char of trimmed) {
		if (char === "(" || char === "[") depth += 1;
		if (char === ")" || char === "]") depth = Math.max(0, depth - 1);

		if (/\s/.test(char) && depth === 0) {
			if (inTrack) count += 1;
			inTrack = false;
			continue;
		}

		inTrack = true;
	}

	if (inTrack) count += 1;

	return count;
}

export function getOverviewGridColumnCount(grid: HTMLElement | null): number {
	if (!grid) return 1;

	const measuredColumns = countGridColumnsFromChildren(grid.children);
	if (measuredColumns > 0) return measuredColumns;

	const templateColumns = window.getComputedStyle(grid).gridTemplateColumns;
	const computedColumns = countGridTemplateColumns(templateColumns);

	return Math.max(1, computedColumns);
}

export type OverviewGridSelectionDirection =
	| "ArrowRight"
	| "ArrowLeft"
	| "ArrowDown"
	| "ArrowUp";

export type OverviewGridSelectionMove = {
	selected: number;
	didMove: boolean;
};

export function getOverviewGridSelectionMove(
	selected: number,
	total: number,
	columns: number,
	direction: OverviewGridSelectionDirection,
): OverviewGridSelectionMove {
	if (total <= 0) return { selected: 0, didMove: false };

	const columnCount = Math.max(1, columns);
	const current = Math.min(Math.max(selected, 0), total - 1);

	let next = current;

	switch (direction) {
		case "ArrowRight":
			next = Math.min(current + 1, total - 1);
			break;
		case "ArrowLeft":
			next = Math.max(current - 1, 0);
			break;
		case "ArrowDown": {
			const lastRowStart = Math.floor((total - 1) / columnCount) * columnCount;
			next =
				current >= lastRowStart
					? current
					: Math.min(current + columnCount, total - 1);
			break;
		}
		case "ArrowUp":
			next = current < columnCount ? current : current - columnCount;
			break;
	}

	return { selected: next, didMove: next !== current };
}
