import {
	hasKeyboardModifier,
	isEditableKeyboardTarget,
} from "./keyboardTarget.ts";

export type HotkeyEvent = Pick<
	KeyboardEvent,
	| "altKey"
	| "ctrlKey"
	| "key"
	| "metaKey"
	| "preventDefault"
	| "shiftKey"
	| "target"
>;

export type HotkeyDefinition = {
	/** Stable identifier for configuration, documentation, and future overrides. */
	id: string;
	/** Human-readable shortcut name. */
	name: string;
	/** User-facing description of what the shortcut does. */
	description: string;
	/** KeyboardEvent.key values that trigger this shortcut. */
	keys: readonly string[];
	/** Run after the shortcut matches an unmodified, non-editable key event. Return false to leave the event unhandled. */
	handler: (event: HotkeyEvent) => unknown;
};

export type HotkeyOptions = {
	/** Prevent the browser default action after a handler accepts the event. */
	preventDefault?: boolean;
	/** Allow hotkeys inside inputs, textareas, and contenteditable elements. */
	allowEditableTarget?: boolean;
};

export function handleHotkeyEvent(
	event: HotkeyEvent,
	hotkeys: readonly HotkeyDefinition[],
	options: HotkeyOptions = {},
): boolean {
	if (hasKeyboardModifier(event)) return false;
	if (!options.allowEditableTarget && isEditableKeyboardTarget(event.target)) {
		return false;
	}

	const hotkey = hotkeys.find((candidate) =>
		candidate.keys.includes(event.key),
	);
	if (!hotkey) return false;

	const handled = hotkey.handler(event) !== false;
	if (!handled) return false;

	if (options.preventDefault ?? true) {
		event.preventDefault();
	}
	return true;
}

export function registerHotkeys(
	target: Window,
	hotkeys: readonly HotkeyDefinition[],
	options?: HotkeyOptions,
): () => void {
	function handler(event: KeyboardEvent) {
		handleHotkeyEvent(event, hotkeys, options);
	}

	target.addEventListener("keydown", handler);
	return () => target.removeEventListener("keydown", handler);
}
