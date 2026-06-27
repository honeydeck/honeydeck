import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
	getPresentationAudienceUrl,
	isPresentationApiSupported,
	sendPresentationSyncRequest,
	startPresentationCast,
	stopPresentationCast,
} from "./presentationApi.ts";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalLocation = Object.getOwnPropertyDescriptor(
	globalThis,
	"location",
);

function setGlobalProperty(name: string, value: unknown) {
	Object.defineProperty(globalThis, name, {
		value,
		configurable: true,
		writable: true,
	});
}

function parseSentMessage(message: unknown) {
	assert.equal(typeof message, "string");
	return JSON.parse(message as string) as unknown;
}

function createConnection() {
	const listeners = new Map<
		string,
		Set<(event: MessageEvent<unknown>) => void>
	>();
	const connection = {
		sent: [] as unknown[],
		closeCalls: 0,
		terminateCalls: 0,
		send(message: unknown) {
			connection.sent.push(message);
		},
		close() {
			connection.closeCalls += 1;
			connection.emit("close");
		},
		terminate() {
			connection.terminateCalls += 1;
			connection.emit("terminate");
		},
		addEventListener(
			type: string,
			listener: (event: MessageEvent<unknown>) => void,
		) {
			const bucket = listeners.get(type) ?? new Set();
			bucket.add(listener);
			listeners.set(type, bucket);
		},
		removeEventListener(
			type: string,
			listener: (event: MessageEvent<unknown>) => void,
		) {
			listeners.get(type)?.delete(listener);
		},
		emit(type: string, event: { data?: unknown } = {}) {
			for (const listener of listeners.get(type) ?? []) {
				listener(event as MessageEvent<unknown>);
			}
		},
	};

	return connection;
}

afterEach(() => {
	if (originalWindow) {
		Object.defineProperty(globalThis, "window", originalWindow);
	} else {
		Reflect.deleteProperty(globalThis, "window");
	}

	if (originalLocation) {
		Object.defineProperty(globalThis, "location", originalLocation);
	} else {
		Reflect.deleteProperty(globalThis, "location");
	}
});

describe("presentation API helpers", () => {
	it("detects Presentation API support from the window constructor", () => {
		Reflect.deleteProperty(globalThis, "window");
		assert.equal(isPresentationApiSupported(), false);

		setGlobalProperty("window", {
			PresentationRequest: class {
				start() {
					return Promise.resolve(null as never);
				}
			},
		});
		assert.equal(isPresentationApiSupported(), true);
	});

	it("builds audience URLs from slide routes", () => {
		setGlobalProperty("location", {
			href: "https://example.com/deck/index.html",
		});

		assert.equal(
			getPresentationAudienceUrl({ view: "slide", slide: 4, step: 2 }),
			"https://example.com/deck/index.html#/4/2",
		);
		assert.equal(
			getPresentationAudienceUrl({ view: "presenter", slide: 4, step: 2 }),
			"https://example.com/deck/index.html#/4/2",
		);
		assert.equal(
			getPresentationAudienceUrl({
				view: "kit",
				slide: 1,
				step: 0,
				kitTab: "layouts",
			}),
			null,
		);
	});

	it("sends a sync request when the receiver connects", () => {
		const connection = createConnection();

		sendPresentationSyncRequest(connection);

		assert.deepEqual(connection.sent.map(parseSentMessage), [
			{ type: "sync-request" },
		]);
	});

	it("starts casting, answers sync requests, and stops cleanly", async () => {
		const connection = createConnection();
		const requestUrls: string[][] = [];
		class FakeRequest {
			constructor(urls: string[]) {
				requestUrls.push(urls);
			}
			async start() {
				return connection;
			}
		}

		const connectionRef = { current: null as typeof connection | null };
		const startInFlightRef = { current: false };
		const castGenerationRef = { current: 0 };
		let isCasting = false;
		const routeRef = { current: { slide: 4, step: 2 } };
		const colorModeRef = {
			current: "dark" as "system" | "light" | "dark",
		};

		await startPresentationCast({
			enabled: true,
			supported: true,
			audienceUrl: "https://example.com/deck/index.html#/4/2",
			currentSlide: 4,
			currentStep: 2,
			currentColorMode: "dark",
			routeRef,
			colorModeRef,
			requestConstructor: FakeRequest as never,
			connectionRef,
			startInFlightRef,
			castGenerationRef,
			setIsCasting: (next) => {
				isCasting = next;
			},
		});

		assert.deepEqual(requestUrls, [
			["https://example.com/deck/index.html#/4/2"],
		]);
		assert.equal(isCasting, true);
		assert.equal(connectionRef.current, connection);
		assert.deepEqual(parseSentMessage(connection.sent[0]), {
			type: "navigate",
			slide: 4,
			step: 2,
		});
		assert.deepEqual(parseSentMessage(connection.sent[1]), {
			type: "color-mode",
			colorMode: "dark",
		});

		routeRef.current = { slide: 7, step: 1 };
		colorModeRef.current = "light";
		connection.emit("message", {
			data: JSON.stringify({ type: "sync-request" }),
		});
		assert.deepEqual(parseSentMessage(connection.sent[2]), {
			type: "sync-response",
			slide: 7,
			step: 1,
			colorMode: "light",
		});

		stopPresentationCast(
			connectionRef,
			(next) => {
				isCasting = next;
			},
			castGenerationRef,
		);

		assert.equal(connection.closeCalls, 0);
		assert.equal(connection.terminateCalls, 1);
		assert.equal(connectionRef.current, null);
		assert.equal(isCasting, false);
	});

	it("does not start casting when Presentation API is unsupported", async () => {
		const connection = createConnection();
		let started = false;

		class FakeRequest {
			constructor() {
				started = true;
			}
			async start() {
				return connection;
			}
		}

		const connectionRef = { current: null as typeof connection | null };
		const startInFlightRef = { current: false };
		const castGenerationRef = { current: 0 };
		let isCasting = false;

		await startPresentationCast({
			enabled: true,
			supported: false,
			audienceUrl: "https://example.com/deck/index.html#/4/2",
			currentSlide: 4,
			currentStep: 2,
			currentColorMode: "system",
			routeRef: { current: { slide: 4, step: 2 } },
			colorModeRef: { current: "system" },
			requestConstructor: FakeRequest as never,
			connectionRef,
			startInFlightRef,
			castGenerationRef,
			setIsCasting: (next) => {
				isCasting = next;
			},
		});

		assert.equal(started, false);
		assert.equal(connectionRef.current, null);
		assert.equal(isCasting, false);
		assert.deepEqual(connection.sent, []);
	});

	it("cancels a stale cast start and closes the late connection", async () => {
		const connection = createConnection();
		let resolveStart!: (value: typeof connection) => void;
		const startPromise = new Promise<typeof connection>((resolve) => {
			resolveStart = resolve;
		});
		class FakeRequest {
			async start() {
				return startPromise;
			}
		}

		const connectionRef = { current: null as typeof connection | null };
		const startInFlightRef = { current: false };
		const castGenerationRef = { current: 0 };
		let isCasting = false;
		const startCast = startPresentationCast({
			enabled: true,
			supported: true,
			audienceUrl: "https://example.com/deck/index.html#/4/2",
			currentSlide: 4,
			currentStep: 2,
			currentColorMode: "light",
			routeRef: { current: { slide: 4, step: 2 } },
			colorModeRef: { current: "light" },
			requestConstructor: FakeRequest as never,
			connectionRef,
			startInFlightRef,
			castGenerationRef,
			setIsCasting: (next) => {
				isCasting = next;
			},
		});

		assert.equal(startInFlightRef.current, true);
		stopPresentationCast(
			connectionRef,
			(next) => {
				isCasting = next;
			},
			castGenerationRef,
		);
		resolveStart(connection);
		await startCast;

		assert.equal(connectionRef.current, null);
		assert.equal(isCasting, false);
		assert.equal(connection.closeCalls, 0);
		assert.equal(connection.terminateCalls, 1);
		assert.deepEqual(connection.sent, []);
		assert.equal(startInFlightRef.current, false);
	});
});
