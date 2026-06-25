import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createSyncBlankScreenMessage,
	createSyncColorModeMessage,
	createSyncRequestMessage,
	createSyncResponseMessage,
	resolveAudienceRouteFromSyncMessage,
} from "./sync.ts";

describe("sync message helpers", () => {
	it("builds request, response, and color mode messages", () => {
		assert.deepEqual(createSyncRequestMessage(), { type: "sync-request" });
		assert.deepEqual(createSyncResponseMessage({ slide: 4, step: 2 }), {
			type: "sync-response",
			slide: 4,
			step: 2,
		});
		assert.deepEqual(createSyncResponseMessage({ slide: 4, step: 2 }, "dark"), {
			type: "sync-response",
			slide: 4,
			step: 2,
			colorMode: "dark",
		});
		assert.deepEqual(createSyncColorModeMessage("light"), {
			type: "color-mode",
			colorMode: "light",
		});
		assert.deepEqual(createSyncBlankScreenMessage("black"), {
			type: "blank-screen",
			mode: "black",
		});
	});

	it("resolves audience routes for live slide and overview views", () => {
		assert.deepEqual(
			resolveAudienceRouteFromSyncMessage(
				{ view: "slide", slide: 1, step: 0 },
				{ type: "navigate", slide: 3, step: 1 },
			),
			{ view: "slide", slide: 3, step: 1 },
		);

		assert.deepEqual(
			resolveAudienceRouteFromSyncMessage(
				{ view: "overview", slide: 2, step: 0 },
				{ type: "sync-response", slide: 5, step: 2 },
			),
			{ view: "overview", slide: 5, step: 2 },
		);
	});

	it("ignores sync routes while the audience is on a reference page", () => {
		assert.equal(
			resolveAudienceRouteFromSyncMessage(
				{ view: "kit", slide: 1, step: 0, kitTab: "layouts" },
				{ type: "navigate", slide: 3, step: 1 },
			),
			null,
		);
	});
});
