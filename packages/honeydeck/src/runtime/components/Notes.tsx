/**
 * Notes component + context for Honeydeck presenter mode.
 *
 * `<Notes>` always renders **nothing** in the DOM — it is purely a vehicle
 * for surfacing speaker notes to the PresenterView.
 *
 * ### How it works
 *
 * 1. `NotesContext` provides a `setNotes` callback.
 * 2. `<PresenterView>` wraps the current slide preview in
 *    `<NotesContext.Provider value={{ setNotes }}>`.
 * 3. When a slide containing `<Notes>` renders inside that tree, the Notes
 *    component fires `useEffect` → calls `setNotes(children)`.
 * 4. PresenterView reads the collected notes from its own state.
 *
 * In audience view (no NotesContext), `<Notes>` simply renders null and the
 * effect is a no-op.
 *
 * ### Authoring
 * ```mdx
 * import { Notes } from '@honeydeck/honeydeck'
 *
 * # My Slide
 *
 * <Notes>
 *   Remember to demo the sparkle button here!
 * </Notes>
 * ```
 */

import {
	createContext,
	isValidElement,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
} from "react";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type NotesContextValue = {
	/** Called by `<Notes>` to push its content into the presenter view. */
	setNotes: (content: ReactNode) => void;
};

/**
 * Provided by PresenterView around the current slide preview.
 * `null` when rendering in audience view — Notes is a no-op in that case.
 */
export const NotesContext = createContext<NotesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type NotesProps = {
	children?: ReactNode;
};

export function getNotesSignature(node: ReactNode): string {
	if (node == null || typeof node === "boolean") return "empty";
	if (
		typeof node === "string" ||
		typeof node === "number" ||
		typeof node === "bigint"
	) {
		return `${typeof node}:${String(node)}`;
	}

	if (Array.isArray(node)) {
		return `array:[${node.map((child) => getNotesSignature(child)).join(",")}]`;
	}

	if (isValidElement(node)) {
		const props = node.props as Record<string, unknown> & {
			children?: ReactNode;
		};
		const propSignature = Object.entries(props)
			.filter(([key]) => key !== "children")
			.filter(([, value]) => value == null || isPrimitive(value))
			.map(([key, value]) => `${key}:${String(value)}`)
			.sort()
			.join(",");

		return [
			"element",
			getElementTypeSignature(node.type),
			node.key ?? "",
			propSignature,
			getNotesSignature(props.children),
		].join(":");
	}

	if (isIterableReactNode(node)) {
		return `iterable:[${Array.from(node)
			.map((child) => getNotesSignature(child))
			.join(",")}]`;
	}

	return typeof node;
}

/**
 * Speaker notes — renders nothing in audience view.
 * Content is collected via `NotesContext` for display in PresenterView.
 *
 * Notes render nothing in audience view, overview thumbnails, and normal PDF
 * output. Markdown inside `<Notes>` is rendered as formatted speaker notes in
 * presenter mode, so use notes for delivery cues, demo reminders, and
 * presenter-only context.
 *
 * ```mdx
 * import { Notes } from '@honeydeck/honeydeck'
 *
 * <Notes>
 *   # Demo cue
 *
 *   - Demo the interactive component.
 *   - Mention PDF export.
 * </Notes>
 * ```
 */
export function Notes({ children }: NotesProps) {
	const ctx = useContext(NotesContext);
	const setNotes = ctx?.setNotes;
	const previousSignatureRef = useRef<string | null>(null);

	useEffect(() => {
		if (!setNotes) return;
		const signature = getNotesSignature(children);
		if (previousSignatureRef.current === signature) return;
		previousSignatureRef.current = signature;
		setNotes(children ?? null);
	}, [children, setNotes]);

	useEffect(() => {
		return () => {
			previousSignatureRef.current = null;
			setNotes?.(null);
		};
	}, [setNotes]);

	return null;
}

function isPrimitive(value: unknown): boolean {
	return (
		value == null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	);
}

function getElementTypeSignature(type: unknown): string {
	if (typeof type === "string") return type;
	if (typeof type === "function") {
		const component = type as { displayName?: string; name?: string };
		return component.displayName ?? component.name ?? "fn";
	}
	if (typeof type === "symbol") return type.description ?? String(type);
	return String(type);
}

function isIterableReactNode(node: ReactNode): node is Iterable<ReactNode> {
	return typeof node === "object" && node != null && Symbol.iterator in node;
}
