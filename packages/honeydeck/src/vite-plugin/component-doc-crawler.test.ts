import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { crawlComponentDocs } from "../vite-plugin/component-doc-crawler.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function getDoc(
	result: ReturnType<typeof crawlComponentDocs>,
	componentName: string,
) {
	const doc = result.docs.find(
		(entry) => entry.componentName === componentName,
	);
	assert.ok(doc, `Expected doc for ${componentName}`);
	return doc;
}

describe("component doc crawler", () => {
	it("discovers public built-in components from the component barrel", () => {
		const result = crawlComponentDocs({ packageRoot });

		assert.deepEqual(result.warnings, []);
		assert.deepEqual(
			result.docs.map((doc) => doc.componentName),
			[
				"BrowserFrame",
				"Keyboard",
				"ListStyle",
				"Notes",
				"Reveal",
				"RevealGroup",
				"RevealWith",
				"TimelineSteps",
			],
		);
		assert.match(
			getDoc(result, "BrowserFrame").markdown,
			/Displays an iframe inside a macOS-style browser window frame\./,
		);
		assert.match(
			getDoc(result, "Keyboard").markdown,
			/Press <Keyboard>Esc<\/Keyboard> to close overview\./,
		);
		assert.match(
			getDoc(result, "Keyboard").markdown,
			/```mdx\nimport { Keyboard } from '@honeydeck\/honeydeck'/,
		);
		assert.match(
			getDoc(result, "RevealWith").markdown,
			/Reveals content at the same timeline step as an existing reveal/,
		);
		assert.equal(
			getDoc(result, "TimelineSteps").publicModuleSpecifier,
			"@honeydeck/honeydeck/components",
		);
		assert.match(
			getDoc(result, "TimelineSteps").markdown,
			/Reserves a static block of slide timeline steps/,
		);
	});

	it("warns when the component barrel is missing", () => {
		const packageRoot = mkdtempSync(
			resolve(tmpdir(), "honeydeck-component-doc-crawler-"),
		);

		try {
			const result = crawlComponentDocs({ packageRoot });

			assert.deepEqual(result.docs, []);
			assert.deepEqual(result.watchedFiles, [result.barrelPath]);
			assert.equal(
				result.barrelPath,
				resolve(packageRoot, "src/runtime/components/index.ts"),
			);
			assert.equal(result.warnings.length, 1);
			assert.match(result.warnings[0] ?? "", /Could not read component barrel/);
		} finally {
			rmSync(packageRoot, { recursive: true, force: true });
		}
	});

	it("extracts prop metadata and parameter defaults", () => {
		const result = crawlComponentDocs({ packageRoot });

		const browserFrame = getDoc(result, "BrowserFrame");
		assert.deepEqual(
			browserFrame.props.map((prop) => ({
				name: prop.name,
				required: prop.required,
				defaultValue: prop.defaultValue,
			})),
			[
				{ name: "src", required: true, defaultValue: undefined },
				{ name: "addressBar", required: false, defaultValue: undefined },
				{ name: "fallbackImage", required: false, defaultValue: undefined },
				{ name: "fallbackDarkImage", required: false, defaultValue: undefined },
				{ name: "fallbackAlt", required: false, defaultValue: undefined },
				{ name: "defaultFallback", required: false, defaultValue: "false" },
				{ name: "aspectRatio", required: false, defaultValue: undefined },
				{ name: "className", required: false, defaultValue: undefined },
				{ name: "iframeClassName", required: false, defaultValue: undefined },
			],
		);
		assert.equal(
			browserFrame.props.find((prop) => prop.name === "aspectRatio")?.type,
			'CSSProperties["aspectRatio"]',
		);
		assert.match(
			browserFrame.props.find((prop) => prop.name === "fallbackImage")
				?.description ?? "",
			/Use this to keep a talk reliable/,
		);

		const keyboard = getDoc(result, "Keyboard");
		assert.deepEqual(
			keyboard.props.map((prop) => ({
				name: prop.name,
				required: prop.required,
				defaultValue: prop.defaultValue,
			})),
			[
				{ name: "keys", required: false, defaultValue: undefined },
				{ name: "children", required: false, defaultValue: undefined },
				{ name: "separator", required: false, defaultValue: '"+"' },
				{ name: "className", required: false, defaultValue: undefined },
			],
		);
		assert.equal(
			keyboard.props.find((prop) => prop.name === "keys")?.type,
			"KeyboardKey | readonly KeyboardKey[]",
		);
		assert.equal(
			keyboard.props.find((prop) => prop.name === "keys")?.description,
			"Key label or ordered shortcut key labels.",
		);

		const revealWith = getDoc(result, "RevealWith");
		assert.deepEqual(
			revealWith.props.map((prop) => ({
				name: prop.name,
				required: prop.required,
				defaultValue: prop.defaultValue,
			})),
			[
				{ name: "target", required: false, defaultValue: undefined },
				{ name: "at", required: false, defaultValue: "1" },
				{ name: "as", required: false, defaultValue: '"div"' },
				{ name: "className", required: false, defaultValue: '""' },
				{ name: "children", required: false, defaultValue: undefined },
			],
		);
		assert.equal(
			revealWith.props.find((prop) => prop.name === "target")?.type,
			"string",
		);

		const timelineSteps = getDoc(result, "TimelineSteps");
		assert.deepEqual(
			timelineSteps.props.map((prop) => ({
				name: prop.name,
				required: prop.required,
				defaultValue: prop.defaultValue,
			})),
			[
				{ name: "steps", required: true, defaultValue: undefined },
				{ name: "at", required: false, defaultValue: "1" },
				{ name: "children", required: false, defaultValue: undefined },
			],
		);
	});
});
