import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";
import {
	buildPdfCaptureTargets,
	resolveColorMode,
	resolveDefaultPdfCaptureConcurrency,
	resolvePdfCaptureConcurrency,
	resolvePdfSteps,
	resolveStaticFilePath,
} from "../cli/pdf.ts";
import { parseAspectRatio } from "../runtime/aspectRatio.ts";

describe("resolvePdfSteps", () => {
	it("defaults to final when no CLI flag or frontmatter is set", () => {
		assert.equal(resolvePdfSteps(null, {}), "final");
	});

	it("reads pdfSteps: all from deck frontmatter", () => {
		assert.equal(resolvePdfSteps(null, { pdfSteps: "all" }), "all");
	});

	it("reads pdfSteps: final from deck frontmatter", () => {
		assert.equal(resolvePdfSteps(null, { pdfSteps: "final" }), "final");
	});

	it("lets CLI --steps override deck frontmatter", () => {
		assert.equal(resolvePdfSteps("final", { pdfSteps: "all" }), "final");
		assert.equal(resolvePdfSteps("all", { pdfSteps: "final" }), "all");
	});

	it("ignores invalid pdfSteps values", () => {
		assert.equal(resolvePdfSteps(null, { pdfSteps: "sometimes" }), "final");
	});
});

describe("resolveColorMode", () => {
	it("defaults to light when no CLI flag or frontmatter is set", () => {
		assert.equal(resolveColorMode(null, {}), "light");
	});

	it("lets CLI --mode override deck frontmatter", () => {
		assert.equal(
			resolveColorMode("dark", { pdfColorMode: "light", colorMode: "light" }),
			"dark",
		);
		assert.equal(
			resolveColorMode("light", { pdfColorMode: "dark", colorMode: "dark" }),
			"light",
		);
	});

	it("uses pdfColorMode before pinned colorMode", () => {
		assert.equal(
			resolveColorMode(null, { pdfColorMode: "dark", colorMode: "light" }),
			"dark",
		);
	});

	it("falls back to pinned colorMode when pdfColorMode is unset", () => {
		assert.equal(resolveColorMode(null, { colorMode: "dark" }), "dark");
		assert.equal(resolveColorMode(null, { colorMode: "light" }), "light");
	});

	it("ignores system colorMode and falls back to light", () => {
		assert.equal(resolveColorMode(null, { colorMode: "system" }), "light");
	});

	it("ignores invalid pdfColorMode as unset", () => {
		assert.equal(
			resolveColorMode(null, { pdfColorMode: "sepia", colorMode: "dark" }),
			"dark",
		);
		assert.equal(resolveColorMode(null, { pdfColorMode: "sepia" }), "light");
	});
});

describe("parseAspectRatio", () => {
	it("defaults to 1920x1080 for missing or invalid ratios", () => {
		assert.deepEqual(parseAspectRatio(undefined), {
			width: 1920,
			height: 1080,
		});
		assert.deepEqual(parseAspectRatio("wide"), { width: 1920, height: 1080 });
		assert.deepEqual(parseAspectRatio("16:0"), { width: 1920, height: 1080 });
	});

	it("keeps base width and derives height from deck aspect ratio", () => {
		assert.deepEqual(parseAspectRatio("16:9"), { width: 1920, height: 1080 });
		assert.deepEqual(parseAspectRatio("4:3"), { width: 1920, height: 1440 });
		assert.deepEqual(parseAspectRatio("1:1"), { width: 1920, height: 1920 });
	});
});

describe("buildPdfCaptureTargets", () => {
	it("builds one final-state target per slide in deck order", () => {
		const targets = buildPdfCaptureTargets(3, [2, 0, 1], "final");

		assert.equal(targets.length, 3);
		assert.deepEqual(
			targets.map(({ pageIndex, slide, slideStepCount, isPdfFinalRender }) => ({
				pageIndex,
				slide,
				slideStepCount,
				isPdfFinalRender,
			})),
			[
				{ pageIndex: 0, slide: 1, slideStepCount: 2, isPdfFinalRender: true },
				{ pageIndex: 1, slide: 2, slideStepCount: 0, isPdfFinalRender: true },
				{ pageIndex: 2, slide: 3, slideStepCount: 1, isPdfFinalRender: true },
			],
		);
		assert.ok(
			targets.every(({ step, slideStepCount }) => step > slideStepCount),
		);
	});

	it("builds all step targets while preserving final PDF page order", () => {
		assert.deepEqual(buildPdfCaptureTargets(2, [2, 1], "all"), [
			{
				pageIndex: 0,
				slide: 1,
				step: 0,
				slideStepCount: 2,
				isPdfFinalRender: false,
			},
			{
				pageIndex: 1,
				slide: 1,
				step: 1,
				slideStepCount: 2,
				isPdfFinalRender: false,
			},
			{
				pageIndex: 2,
				slide: 1,
				step: 2,
				slideStepCount: 2,
				isPdfFinalRender: false,
			},
			{
				pageIndex: 3,
				slide: 2,
				step: 0,
				slideStepCount: 1,
				isPdfFinalRender: false,
			},
			{
				pageIndex: 4,
				slide: 2,
				step: 1,
				slideStepCount: 1,
				isPdfFinalRender: false,
			},
		]);
	});
});

describe("resolvePdfCaptureConcurrency", () => {
	it("caps workers to the available target count", () => {
		assert.equal(resolvePdfCaptureConcurrency(4, 0), 0);
		assert.equal(resolvePdfCaptureConcurrency(4, 2), 2);
		assert.equal(resolvePdfCaptureConcurrency(4, 8), 4);
	});
});

describe("resolveDefaultPdfCaptureConcurrency", () => {
	it("uses CPU count with a 1 minimum and 16 maximum", () => {
		assert.equal(resolveDefaultPdfCaptureConcurrency(0), 1);
		assert.equal(resolveDefaultPdfCaptureConcurrency(6), 6);
		assert.equal(resolveDefaultPdfCaptureConcurrency(32), 16);
	});
});

describe("resolveStaticFilePath", () => {
	function withStaticRoot(callback: (root: string) => void): void {
		const root = mkdtempSync(join(tmpdir(), "honeydeck-static-"));
		writeFileSync(join(root, "index.html"), "<!doctype html>");
		writeFileSync(join(root, "asset.js"), "console.log('asset');");

		try {
			callback(root);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	}

	it("serves root and existing assets from inside the static root", () => {
		withStaticRoot((root) => {
			assert.equal(resolveStaticFilePath(root, "/"), join(root, "index.html"));
			assert.equal(
				resolveStaticFilePath(root, "/asset.js?cache=1"),
				join(root, "asset.js"),
			);
		});
	});

	it("falls back to index.html for SPA routes and missing files", () => {
		withStaticRoot((root) => {
			assert.equal(
				resolveStaticFilePath(root, "/slides/1"),
				join(root, "index.html"),
			);
			assert.equal(
				resolveStaticFilePath(root, "/missing.js"),
				join(root, "index.html"),
			);
		});
	});

	it("rejects traversal outside the static root", () => {
		withStaticRoot((root) => {
			assert.equal(resolveStaticFilePath(root, "/../package.json"), null);
			assert.equal(resolveStaticFilePath(root, "/..%2Fpackage.json"), null);
		});
	});

	it("rejects malformed or unsafe encoded paths", () => {
		withStaticRoot((root) => {
			assert.equal(resolveStaticFilePath(root, "/%E0%A4%A"), null);
			assert.equal(resolveStaticFilePath(root, "/%00"), null);
		});
	});

	it("keeps decoded absolute-looking paths inside the static root", () => {
		withStaticRoot((root) => {
			assert.equal(
				resolveStaticFilePath(root, encodeURI(`/${resolve(root, "asset.js")}`)),
				join(root, "index.html"),
			);
		});
	});
});
