import assert from "node:assert/strict";
import { win32 } from "node:path";
import { describe, it } from "node:test";
import { resolveParentDir } from "../cli/init.ts";

describe("init path helpers", () => {
	it("resolves Windows-style parent directories", () => {
		const abs = win32.resolve("C:\\Users\\demo\\talk", "styles.css");

		assert.equal(
			resolveParentDir(abs, win32.dirname),
			win32.resolve("C:\\Users\\demo\\talk"),
		);
	});
});
