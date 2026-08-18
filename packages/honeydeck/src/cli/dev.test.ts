import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it } from "node:test";
import type { Connect, ViteDevServer } from "vite";
import { appShellPlugin } from "./dev.ts";

type FakeResponse = {
	headers: Record<string, string>;
	body: string | null;
};

/**
 * Run the app-shell middleware for `url` and report the response it wrote.
 * `next` calls are recorded so pass-through behavior is observable too.
 */
async function requestAppShell(url: string): Promise<{
	response: FakeResponse;
	nextCalls: number;
}> {
	const plugin = appShellPlugin(process.cwd());
	assert.equal(typeof plugin.configureServer, "function");

	let middleware: Connect.NextHandleFunction | null = null;
	const server = {
		middlewares: {
			use(handler: Connect.NextHandleFunction) {
				middleware = handler;
			},
		},
		transformIndexHtml: async (_url: string, html: string) => html,
	} as unknown as ViteDevServer;

	await (plugin.configureServer as (s: ViteDevServer) => void | Promise<void>)(
		server,
	);
	assert.ok(middleware, "app-shell middleware should be registered");

	const response: FakeResponse = { headers: {}, body: null };
	let nextCalls = 0;

	const res = {
		setHeader(name: string, value: string) {
			response.headers[name.toLowerCase()] = value;
		},
		end(body?: string) {
			response.body = body ?? null;
		},
	} as unknown as ServerResponse;

	await new Promise<void>((resolvePromise) => {
		const next = () => {
			nextCalls++;
			resolvePromise();
		};
		const maybePromise = (middleware as Connect.NextHandleFunction)(
			{ url } as IncomingMessage,
			res,
			next,
		);
		void Promise.resolve(maybePromise).then(() => resolvePromise());
	});

	return { response, nextCalls };
}

describe("app shell middleware", () => {
	it("serves the app shell HTML without browser caching", async () => {
		const { response, nextCalls } = await requestAppShell("/");

		assert.equal(nextCalls, 0);
		assert.equal(response.headers["cache-control"], "no-cache");
		assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
		assert.ok(response.body?.includes("<html"));
	});

	it("passes non-root requests through untouched", async () => {
		const { response, nextCalls } = await requestAppShell("/slides/1");

		assert.equal(nextCalls, 1);
		assert.deepEqual(response.headers, {});
		assert.equal(response.body, null);
	});
});
