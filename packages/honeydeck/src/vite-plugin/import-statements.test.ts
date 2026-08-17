import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	findImportStatementEnd,
	partitionImportStatements,
} from "../vite-plugin/import-statements.ts";

describe("findImportStatementEnd", () => {
	it("ends a single-line import on its own line", () => {
		const lines = ["import Foo from './Foo'", "# Heading"];
		assert.equal(findImportStatementEnd(lines, 0), 0);
	});

	it("ends a side-effect import on its own line", () => {
		assert.equal(findImportStatementEnd(["import './styles.css'"], 0), 0);
	});

	it("spans a multi-line named import", () => {
		const lines = [
			"import {",
			"  MapIcon,",
			"  RouteIcon,",
			'} from "icons";',
			"# Heading",
		];
		assert.equal(findImportStatementEnd(lines, 0), 3);
	});

	it("spans a multi-line named import without a trailing semicolon", () => {
		const lines = ["import {", "  Foo,", "} from 'pkg'", ""];
		assert.equal(findImportStatementEnd(lines, 0), 2);
	});

	it("ignores comments inside the specifier list", () => {
		const lines = [
			"import {",
			"  // icons",
			"  MapIcon, /* inline { */",
			"} from 'pkg';",
		];
		assert.equal(findImportStatementEnd(lines, 0), 3);
	});

	it("spans import attributes", () => {
		const lines = [
			"import data from './data.json' with {",
			'  type: "json",',
			"};",
		];
		assert.equal(findImportStatementEnd(lines, 0), 2);
	});

	it("returns null for prose that starts with the word import", () => {
		const lines = [
			"import maps are useful",
			"",
			'They pair well with "quotes".',
		];
		assert.equal(findImportStatementEnd(lines, 0), null);
	});

	it("returns null for an unterminated statement", () => {
		const lines = ["import {", "  Foo,", "", "# Heading"];
		assert.equal(findImportStatementEnd(lines, 0), null);
	});
});

describe("partitionImportStatements", () => {
	it("keeps multi-line imports together and content separate", () => {
		const { importLines, contentLines } = partitionImportStatements([
			"import { Reveal } from '@honeydeck/honeydeck'",
			"import {",
			"  MapIcon,",
			"} from './icons'",
			"",
			"# Slide",
		]);

		assert.deepEqual(importLines, [
			"import { Reveal } from '@honeydeck/honeydeck'",
			"import {",
			"  MapIcon,",
			"} from './icons'",
		]);
		assert.deepEqual(contentLines, ["", "# Slide"]);
	});

	it("treats imports inside fenced code blocks as content", () => {
		const lines = [
			"```ts",
			"import { Foo } from 'pkg'",
			"```",
			"import { Bar } from 'pkg'",
		];
		const { importLines, contentLines } = partitionImportStatements(lines);

		assert.deepEqual(importLines, ["import { Bar } from 'pkg'"]);
		assert.deepEqual(contentLines, [
			"```ts",
			"import { Foo } from 'pkg'",
			"```",
		]);
	});

	it("keeps prose starting with import as content", () => {
		const lines = ["import maps are useful", "", "Body copy."];
		const { importLines, contentLines } = partitionImportStatements(lines);

		assert.deepEqual(importLines, []);
		assert.deepEqual(contentLines, lines);
	});
});
