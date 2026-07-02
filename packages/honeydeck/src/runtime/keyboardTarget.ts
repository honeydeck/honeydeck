export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	if (typeof HTMLElement === "undefined") return false;
	if (!(target instanceof HTMLElement)) return false;

	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function hasKeyboardModifier(
	event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">,
): boolean {
	return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
