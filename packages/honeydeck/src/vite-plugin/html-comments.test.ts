import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripHtmlComments } from "./html-comments.ts";

describe("stripHtmlComments", () => {
	it("removes single-line comments", () => {
		assert.equal(
			stripHtmlComments("# Title <!-- speaker hint --> tail"),
			"# Title  tail",
		);
	});

	it("drops lines that only contain a comment", () => {
		assert.equal(
			stripHtmlComments("First line\n<!-- a note -->\nSecond line"),
			"First line\nSecond line",
		);
	});

	it("removes multi-line comments", () => {
		const source = [
			"# Slide",
			"<!--",
			"layout: Cover",
			"---",
			"-->",
			"Body",
		].join("\n");

		assert.equal(stripHtmlComments(source), "# Slide\nBody");
	});

	it("keeps comments inside fenced code blocks", () => {
		const source = ["```html", "<!-- literal -->", "```", "<!-- gone -->"].join(
			"\n",
		);

		assert.equal(stripHtmlComments(source), "```html\n<!-- literal -->\n```");
	});

	it("keeps surrounding text on partially commented lines", () => {
		assert.equal(
			stripHtmlComments("before <!-- x\ny\nz --> after"),
			"before \n after",
		);
	});

	it("removes everything after an unterminated comment", () => {
		assert.equal(stripHtmlComments("visible\n<!-- open\nhidden"), "visible");
	});

	it("leaves sources without comments unchanged", () => {
		const source = "# Slide\n\nBody with a <Component /> usage\n";
		assert.equal(stripHtmlComments(source), source);
	});
});
