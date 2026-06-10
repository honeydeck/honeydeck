const INTERACTIVE_SELECTOR = [
	"button",
	"a[href]",
	"input",
	"textarea",
	"select",
	"summary",
	"[contenteditable='true']",
	"[role='button']",
	"[role='link']",
].join(",");

const SCROLL_OVERFLOW_VALUES = new Set(["auto", "scroll"]);

function isElement(value: EventTarget | null): value is Element {
	return typeof Element !== "undefined" && value instanceof Element;
}

function isHTMLElement(value: Element): value is HTMLElement {
	return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

function allowsScroll(value: string): boolean {
	return SCROLL_OVERFLOW_VALUES.has(value);
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!isElement(target)) return false;
	return target.closest(INTERACTIVE_SELECTOR) !== null;
}

export function findScrollableAncestor(
	target: EventTarget | null,
	boundary?: Element | null,
): HTMLElement | null {
	if (!isElement(target)) return null;

	let current: Element | null = target;
	while (current && current !== boundary) {
		if (isHTMLElement(current)) {
			if (current.hasAttribute("data-honeydeck-scrollable")) return current;

			const style = window.getComputedStyle(current);
			const canScrollY =
				allowsScroll(style.overflowY) &&
				current.scrollHeight > current.clientHeight;
			const canScrollX =
				allowsScroll(style.overflowX) &&
				current.scrollWidth > current.clientWidth;

			if (canScrollY || canScrollX) return current;
		}

		current = current.parentElement;
	}

	return null;
}

export function shouldDeckOwnTouchGesture(
	target: EventTarget | null,
	boundary?: Element | null,
): boolean {
	if (!isElement(target)) return false;
	if (target.closest("[data-honeydeck-no-swipe]")) return false;
	if (isInteractiveTarget(target)) return false;
	return findScrollableAncestor(target, boundary) === null;
}
