import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluate } from "@mdx-js/mdx";
import { createElement, Fragment } from "react";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import { PresenterNotesPanel } from "../../runtime/views/PresenterNotesPanel.tsx";

describe("speaker notes markdown", () => {
	it("renders markdown inside <Notes> as speaker-note content", async () => {
		const { default: Markdown } = await evaluate(
			[
				"<Notes>",
				"",
				"# Demo cue",
				"",
				"- Mention **PDF export**",
				"- Show `honeydeck pdf`",
				"",
				"</Notes>",
			].join("\n"),
			{
				...runtime,
				development: false,
				remarkPlugins: [remarkGfm],
			},
		);

		const html = renderToStaticMarkup(
			createElement(Markdown, {
				components: {
					Notes: ({ children }) => createElement(Fragment, null, children),
				},
			}),
		);

		assert.match(html, /<h1>Demo cue<\/h1>/);
		assert.match(html, /<ul>/);
		assert.match(html, /<strong>PDF export<\/strong>/);
		assert.match(html, /<code>honeydeck pdf<\/code>/);
	});

	it("wraps presenter notes content in the notes panel", () => {
		const html = renderToStaticMarkup(
			createElement(PresenterNotesPanel, {
				notes: createElement(
					Fragment,
					null,
					createElement("h1", null, "Demo cue"),
					createElement(
						"ul",
						null,
						createElement("li", null, "Mention PDF export"),
					),
				),
			}),
		);

		assert.match(html, /<h1>Demo cue<\/h1>/);
		assert.match(html, /<li>Mention PDF export<\/li>/);
	});

	it("shows an empty state when there are no notes", () => {
		const html = renderToStaticMarkup(
			createElement(PresenterNotesPanel, { notes: null }),
		);

		assert.match(html, /No notes for this slide\./);
	});
});
