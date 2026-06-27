import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	HONEYDECK_APP_SHELL_ENTRY,
	HONEYDECK_APP_SHELL_PLACEHOLDER,
	injectHoneydeckAppShellEntry,
} from "./app-shell-entry.ts";

describe("Honeydeck app shell entry injection", () => {
	it("loads the app shell through the Honeydeck package subpath", () => {
		const html = `<script type="module">import "${HONEYDECK_APP_SHELL_PLACEHOLDER}";</script>`;
		const result = injectHoneydeckAppShellEntry(html);

		assert.equal(
			result,
			`<script type="module">import "${HONEYDECK_APP_SHELL_ENTRY}";</script>`,
		);
	});
});
