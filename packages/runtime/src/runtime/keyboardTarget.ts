export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
	if (typeof HTMLElement === "undefined") return false;
	if (!(target instanceof HTMLElement)) return false;

	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
