import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Keyboard as BarrelKeyboard } from "../../runtime/components/index.ts";
import { Keyboard } from "../../runtime/components/Keyboard.tsx";
import { Keyboard as RootKeyboard } from "../../runtime/index.ts";
import { isEditableKeyboardTarget } from "../../runtime/keyboardTarget.ts";

describe("<Keyboard>", () => {
	it("renders children as one <kbd>", () => {
		const html = renderToStaticMarkup(createElement(Keyboard, null, "Esc"));

		assert.equal((html.match(/<kbd\b/g) ?? []).length, 1);
		assert.match(html, />Esc<\/kbd>$/);
	});

	it("renders a single keys value as one <kbd> and merges className", () => {
		const html = renderToStaticMarkup(
			createElement(Keyboard, { keys: "Space", className: "custom" }),
		);

		assert.equal((html.match(/<kbd\b/g) ?? []).length, 1);
		assert.match(html, />Space<\/kbd>$/);
		assert.match(html, /\bcustom\b/);
	});

	it("renders an ordered keys array with separators between keys", () => {
		const html = renderToStaticMarkup(
			createElement(Keyboard, { keys: ["Ctrl", "Shift", "P"] }),
		);

		assert.match(html, /^<span\b/);
		assert.equal((html.match(/<kbd\b/g) ?? []).length, 3);
		assert.ok(
			html.indexOf(">Ctrl<") < html.indexOf(">Shift<") &&
				html.indexOf(">Shift<") < html.indexOf(">P<"),
		);
		assert.equal((html.match(/>\+<\/span>/g) ?? []).length, 2);
	});

	it("uses a custom separator for shortcut keys", () => {
		const html = renderToStaticMarkup(
			createElement(Keyboard, { keys: ["⌘", "K"], separator: " then " }),
		);

		assert.match(html, /> then <\/span>/);
	});

	it("re-exports Keyboard from both public barrels", () => {
		assert.equal(RootKeyboard, Keyboard);
		assert.equal(BarrelKeyboard, Keyboard);
	});
});

describe("isEditableKeyboardTarget", () => {
	class FakeHTMLElement extends EventTarget {
		tagName: string;
		isContentEditable: boolean;

		constructor(tagName: string, isContentEditable = false) {
			super();
			this.tagName = tagName;
			this.isContentEditable = isContentEditable;
		}
	}

	const originalHTMLElement = globalThis.HTMLElement;

	before(() => {
		Object.defineProperty(globalThis, "HTMLElement", {
			configurable: true,
			value: FakeHTMLElement,
		});
	});

	it("returns true for inputs, textareas, and contenteditable elements", () => {
		assert.equal(isEditableKeyboardTarget(new FakeHTMLElement("INPUT")), true);
		assert.equal(
			isEditableKeyboardTarget(new FakeHTMLElement("TEXTAREA")),
			true,
		);
		assert.equal(
			isEditableKeyboardTarget(new FakeHTMLElement("DIV", true)),
			true,
		);
	});

	it("returns false for normal elements and null targets", () => {
		assert.equal(
			isEditableKeyboardTarget(new FakeHTMLElement("BUTTON")),
			false,
		);
		assert.equal(isEditableKeyboardTarget(null), false);
	});

	it("returns false when HTMLElement is unavailable", () => {
		const globalWithHTMLElement = globalThis as typeof globalThis & {
			HTMLElement?: typeof HTMLElement;
		};
		const original = globalWithHTMLElement.HTMLElement;

		Reflect.deleteProperty(globalWithHTMLElement, "HTMLElement");

		try {
			assert.equal(
				isEditableKeyboardTarget(new FakeHTMLElement("INPUT")),
				false,
			);
		} finally {
			Object.defineProperty(globalThis, "HTMLElement", {
				configurable: true,
				value: original,
			});
		}
	});

	after(() => {
		Object.defineProperty(globalThis, "HTMLElement", {
			configurable: true,
			value: originalHTMLElement,
		});
	});
});
