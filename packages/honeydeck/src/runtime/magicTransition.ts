const MAGIC_SELECTOR = "[data-magic-id]";

type MagicElementSnapshot = {
	element: HTMLElement;
	rect: DOMRect;
};

type HiddenOriginal = {
	element: HTMLElement;
	opacity: string;
	transition: string;
};

type MagicClonePlan = {
	wrapper: HTMLDivElement;
	fromRect: DOMRect;
	toRect: DOMRect;
	fromOpacity: number;
	toOpacity: number;
};

export type MagicTransitionOptions = {
	fromLayer: HTMLElement | null | undefined;
	toLayer: HTMLElement | null | undefined;
	duration: number;
	easing: string;
	scale: number;
	direction: 1 | -1;
};

export function startMagicTransition({
	fromLayer,
	toLayer,
	duration,
	easing,
	scale,
	direction,
}: MagicTransitionOptions): () => void {
	if (direction !== 1 || !fromLayer || !toLayer || scale <= 0) {
		return () => {};
	}

	const fromElements = collectMagicElements(fromLayer);
	const toElements = collectMagicElements(toLayer);
	const ids = new Set([...fromElements.keys(), ...toElements.keys()]);
	if (ids.size === 0) return () => {};

	const overlay = document.createElement("div");
	overlay.setAttribute("aria-hidden", "true");
	overlay.style.position = "fixed";
	overlay.style.inset = "0";
	overlay.style.pointerEvents = "none";
	overlay.style.zIndex = "90";
	overlay.style.overflow = "visible";
	overlay.style.contain = "layout style paint";

	let plans: MagicClonePlan[];
	try {
		plans = createMagicClonePlans(ids, fromElements, toElements, scale);
	} catch {
		overlay.remove();
		return () => {};
	}

	if (plans.length === 0) return () => {};
	if (typeof plans[0]?.wrapper.animate !== "function") return () => {};

	const hiddenOriginals = hideOriginals(fromElements, toElements);
	const animations: Animation[] = [];
	let cleaned = false;
	let timeout: number | null = null;

	function cleanup() {
		if (cleaned) return;
		cleaned = true;
		if (timeout !== null) {
			window.clearTimeout(timeout);
			timeout = null;
		}
		for (const animation of animations) {
			if (animation.playState !== "finished") animation.cancel();
		}
		restoreOriginals(hiddenOriginals);
		overlay.remove();
	}

	try {
		document.body.appendChild(overlay);

		for (const plan of plans) {
			overlay.appendChild(plan.wrapper);
			const offset = alignCloneToRect(plan.wrapper, plan.fromRect, scale);
			applyCloneFrame(
				plan.wrapper,
				plan.fromRect,
				plan.fromOpacity,
				scale,
				offset,
			);
			const animation = animateClone({
				...plan,
				duration,
				easing,
				scale,
				offsetX: offset.x,
				offsetY: offset.y,
			});
			if (!animation) throw new Error("Magic transition animation failed");
			animations.push(animation);
		}
	} catch {
		cleanup();
		return () => {};
	}

	void Promise.allSettled(
		animations.map((animation) => animation.finished),
	).then(cleanup);
	timeout = window.setTimeout(cleanup, duration + 50);

	return cleanup;
}

function collectMagicElements(
	root: HTMLElement,
): Map<string, MagicElementSnapshot> {
	const elements = new Map<string, MagicElementSnapshot>();
	for (const element of root.querySelectorAll<HTMLElement>(MAGIC_SELECTOR)) {
		const id = element.dataset.magicId?.trim();
		if (!id || elements.has(id)) continue;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 && rect.height <= 0) continue;
		elements.set(id, { element, rect });
	}
	return elements;
}

function createMagicClonePlans(
	ids: Set<string>,
	fromElements: Map<string, MagicElementSnapshot>,
	toElements: Map<string, MagicElementSnapshot>,
	scale: number,
): MagicClonePlan[] {
	const plans: MagicClonePlan[] = [];
	for (const id of ids) {
		const from = fromElements.get(id);
		const to = toElements.get(id);
		if (from && to) {
			plans.push({
				wrapper: createMagicClone(to.element, to.rect, scale),
				fromRect: from.rect,
				toRect: to.rect,
				fromOpacity: 1,
				toOpacity: 1,
			});
			continue;
		}

		if (from) {
			plans.push({
				wrapper: createMagicClone(from.element, from.rect, scale),
				fromRect: from.rect,
				toRect: from.rect,
				fromOpacity: 1,
				toOpacity: 0,
			});
			continue;
		}

		if (to) {
			plans.push({
				wrapper: createMagicClone(to.element, to.rect, scale),
				fromRect: to.rect,
				toRect: to.rect,
				fromOpacity: 0,
				toOpacity: 1,
			});
		}
	}
	return plans;
}

function hideOriginals(
	fromElements: Map<string, MagicElementSnapshot>,
	toElements: Map<string, MagicElementSnapshot>,
): HiddenOriginal[] {
	const originals = new Set<HTMLElement>();
	for (const { element } of fromElements.values()) originals.add(element);
	for (const { element } of toElements.values()) originals.add(element);

	return Array.from(originals, (element) => {
		const hidden = {
			element,
			opacity: element.style.opacity,
			transition: element.style.transition,
		};
		element.style.transition = "none";
		element.style.opacity = "0";
		return hidden;
	});
}

function restoreOriginals(originals: HiddenOriginal[]) {
	for (const { element, opacity, transition } of originals) {
		element.style.opacity = opacity;
		element.style.transition = transition;
	}
}

function createMagicClone(
	source: HTMLElement,
	rect: DOMRect,
	scale: number,
): HTMLDivElement {
	const wrapper = document.createElement("div");
	wrapper.style.position = "fixed";
	wrapper.style.left = "0px";
	wrapper.style.top = "0px";
	wrapper.style.margin = "0";
	wrapper.style.width = `${rect.width / scale}px`;
	wrapper.style.height = `${rect.height / scale}px`;
	wrapper.style.pointerEvents = "none";
	wrapper.style.transformOrigin = "top left";
	wrapper.style.transform = transformForRect(rect, scale, 0, 0);
	wrapper.style.opacity = "1";
	wrapper.style.overflow = "visible";
	wrapper.style.lineHeight = "0";

	const clone = source.cloneNode(true) as HTMLElement;
	const sourceDisplay = window.getComputedStyle(source).display;
	copyComputedStyles(source, clone);
	clone.removeAttribute("id");
	for (const descendant of clone.querySelectorAll("[id]")) {
		descendant.removeAttribute("id");
	}
	clone.style.boxSizing = "border-box";
	clone.style.transform = "none";
	if (sourceDisplay === "inline") {
		clone.style.display = "inline";
		clone.style.width = "auto";
		clone.style.height = "auto";
	} else {
		clone.style.width = "100%";
		clone.style.height = "100%";
	}
	clone.style.margin = "0";
	clone.style.pointerEvents = "none";
	clone.style.transformOrigin = "top left";
	clone.style.verticalAlign = "top";
	wrapper.appendChild(clone);
	return wrapper;
}

function copyComputedStyles(source: Element, clone: Element) {
	if (!(clone instanceof HTMLElement)) return;

	const computed = window.getComputedStyle(source);
	for (let index = 0; index < computed.length; index += 1) {
		const property = computed.item(index);
		clone.style.setProperty(
			property,
			computed.getPropertyValue(property),
			computed.getPropertyPriority(property),
		);
	}

	const sourceChildren = Array.from(source.children);
	const cloneChildren = Array.from(clone.children);
	for (let index = 0; index < sourceChildren.length; index += 1) {
		const sourceChild = sourceChildren[index];
		const cloneChild = cloneChildren[index];
		if (sourceChild && cloneChild) copyComputedStyles(sourceChild, cloneChild);
	}
}

function alignCloneToRect(
	wrapper: HTMLDivElement,
	rect: DOMRect,
	scale: number,
): { x: number; y: number } {
	const wrapperRect = wrapper.getBoundingClientRect();
	const cloneRect =
		wrapper.firstElementChild?.getBoundingClientRect() ?? wrapperRect;
	const x = cloneRect.left - wrapperRect.left;
	const y = cloneRect.top - wrapperRect.top;
	wrapper.style.left = "0px";
	wrapper.style.top = "0px";
	wrapper.style.transform = transformForRect(rect, scale, x, y);
	return { x, y };
}

function applyCloneFrame(
	wrapper: HTMLDivElement,
	rect: DOMRect,
	opacity: number,
	scale: number,
	offset: { x: number; y: number },
) {
	wrapper.style.width = `${rect.width / scale}px`;
	wrapper.style.height = `${rect.height / scale}px`;
	wrapper.style.opacity = `${opacity}`;
	wrapper.style.transform = transformForRect(rect, scale, offset.x, offset.y);
}

function animateClone({
	wrapper,
	fromRect,
	toRect,
	fromOpacity,
	toOpacity,
	duration,
	easing,
	scale,
	offsetX,
	offsetY,
}: MagicClonePlan & {
	duration: number;
	easing: string;
	scale: number;
	offsetX: number;
	offsetY: number;
}): Animation | null {
	const keyframes: Keyframe[] = [
		{
			width: `${fromRect.width / scale}px`,
			height: `${fromRect.height / scale}px`,
			opacity: fromOpacity,
			transform: transformForRect(fromRect, scale, offsetX, offsetY),
		},
		{
			width: `${toRect.width / scale}px`,
			height: `${toRect.height / scale}px`,
			opacity: toOpacity,
			transform: transformForRect(toRect, scale, offsetX, offsetY),
		},
	];

	if (typeof wrapper.animate !== "function") return null;

	try {
		return wrapper.animate(keyframes, {
			duration,
			easing,
			fill: "both",
		});
	} catch {
		try {
			return wrapper.animate(keyframes, {
				duration,
				easing: "ease",
				fill: "both",
			});
		} catch {
			return null;
		}
	}
}

function transformForRect(
	rect: DOMRect,
	scale: number,
	offsetX: number,
	offsetY: number,
): string {
	return `translate(${rect.left - offsetX}px, ${rect.top - offsetY}px) scale(${scale})`;
}
