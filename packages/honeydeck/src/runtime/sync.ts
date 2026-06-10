/**
 * BroadcastChannel sync for Honeydeck presenter ↔ audience coordination.
 *
 * The presenter window is the **controller** — it sends `navigate` messages
 * whenever its route changes. Audience windows listen and apply them.
 *
 * Late-opening audience tabs send a `sync-request` so the presenter can reply
 * with a `sync-response` containing the current route immediately.
 *
 * ### Message types
 * - `navigate`              — presenter changed slide/step
 * - `sync-request`          — audience asks for the current presenter route
 * - `sync-response`         — presenter replies with the current route
 * - `presenter-connected`   — a presenter window opened
 * - `presenter-disconnected`— a presenter window closed
 *
 * ### Constraints
 * - Same-origin, same browser profile only (BroadcastChannel limitation).
 * - If BroadcastChannel is unavailable, the hook is a no-op.
 *
 * ### Usage
 * ```tsx
 * // In audience Deck:
 * useSync({ isPresenter: false });
 *
 * // In PresenterView:
 * useSync({ isPresenter: true, currentSlide: slide, currentStep: step });
 * ```
 */

import { useEffect, useRef, useState } from "react";
import { navigate, parseHash, type Route } from "./router.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncNavigateMessage = {
	type: "navigate";
	slide: number;
	step: number;
};

export type SyncRequestMessage = {
	type: "sync-request";
};

export type SyncResponseMessage = {
	type: "sync-response";
	slide: number;
	step: number;
};

export type SyncPresenceMessage =
	| { type: "presenter-connected" }
	| { type: "presenter-disconnected" };

export type SyncMessage =
	| SyncNavigateMessage
	| SyncRequestMessage
	| SyncResponseMessage
	| SyncPresenceMessage;

export type UseSyncOptions = {
	/** Whether this hook should connect to BroadcastChannel. */
	enabled?: boolean;
	/** True when this window is the presenter (controller). */
	isPresenter: boolean;
	/** Current 1-based slide number (required when `isPresenter: true`). */
	currentSlide?: number;
	/** Current 0-based step index (required when `isPresenter: true`). */
	currentStep?: number;
};

type PresenterRoute = {
	slide: number;
	step: number;
};

const CHANNEL_NAME = "honeydeck";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function createSyncRequestMessage(): SyncRequestMessage {
	return { type: "sync-request" };
}

export function createSyncResponseMessage(
	route: PresenterRoute,
): SyncResponseMessage {
	return {
		type: "sync-response",
		slide: route.slide,
		step: route.step,
	};
}

export function resolveAudienceRouteFromSyncMessage(
	currentRoute: Route,
	message: SyncNavigateMessage | SyncResponseMessage,
): Route | null {
	if (currentRoute.view === "kit") return null;

	return {
		view: currentRoute.view === "overview" ? "overview" : "slide",
		slide: message.slide,
		step: message.step,
	};
}

function isSyncMessage(value: unknown): value is SyncMessage {
	if (typeof value !== "object" || value === null) return false;
	if (!("type" in value)) return false;

	const type = (value as { type?: unknown }).type;
	if (type === "sync-request") return true;
	if (type === "presenter-connected") return true;
	if (type === "presenter-disconnected") return true;

	if (type !== "navigate" && type !== "sync-response") return false;

	const slide = (value as { slide?: unknown }).slide;
	const step = (value as { step?: unknown }).step;
	return (
		typeof slide === "number" &&
		Number.isFinite(slide) &&
		typeof step === "number" &&
		Number.isFinite(step)
	);
}

function isRouteSyncMessage(
	message: SyncMessage,
): message is SyncNavigateMessage | SyncResponseMessage {
	return message.type === "navigate" || message.type === "sync-response";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Bidirectional sync hook.
 *
 * @returns `{ presenterConnected }` — true when an audience window has
 * detected that a presenter window is open on the same channel.
 */
export function useSync({
	enabled = true,
	isPresenter,
	currentSlide,
	currentStep,
}: UseSyncOptions): { presenterConnected: boolean } {
	const [presenterConnected, setPresenterConnected] = useState(false);
	const channelRef = useRef<BroadcastChannel | null>(null);
	const presenterRouteRef = useRef<PresenterRoute>({
		slide: currentSlide ?? 1,
		step: currentStep ?? 0,
	});

	useEffect(() => {
		if (!isPresenter) return;
		if (currentSlide === undefined || currentStep === undefined) return;

		presenterRouteRef.current = {
			slide: currentSlide,
			step: currentStep,
		};
	}, [currentSlide, currentStep, isPresenter]);

	// ── Channel lifecycle ───────────────────────────────────────────────────

	useEffect(() => {
		if (!enabled) return;

		// BroadcastChannel may not exist in every environment (e.g. node tests).
		if (typeof BroadcastChannel === "undefined") return;

		const channel = new BroadcastChannel(CHANNEL_NAME);
		channelRef.current = channel;

		// Announce presence when presenter opens.
		if (isPresenter) {
			channel.postMessage({
				type: "presenter-connected",
			} satisfies SyncMessage);
		}

		channel.addEventListener("message", (e: MessageEvent<unknown>) => {
			if (!isSyncMessage(e.data)) return;

			const msg = e.data;

			if (isPresenter) {
				// Presenter is controller. It only answers sync requests.
				if (msg.type === "sync-request") {
					channel.postMessage(
						createSyncResponseMessage(
							presenterRouteRef.current,
						) satisfies SyncMessage,
					);
				}
				return;
			}

			if (msg.type === "presenter-disconnected") {
				setPresenterConnected(false);
				return;
			}

			if (msg.type === "presenter-connected") {
				setPresenterConnected(true);
				return;
			}

			if (isRouteSyncMessage(msg)) {
				setPresenterConnected(true);
				const currentRoute = parseHash(location.hash);
				const nextRoute = resolveAudienceRouteFromSyncMessage(
					currentRoute,
					msg,
				);
				if (nextRoute) {
					navigate(nextRoute);
				}
			}
		});

		if (!isPresenter) {
			channel.postMessage(createSyncRequestMessage() satisfies SyncMessage);
		}

		return () => {
			if (isPresenter) {
				channel.postMessage({
					type: "presenter-disconnected",
				} satisfies SyncMessage);
			}
			channel.close();
			channelRef.current = null;
		};
	}, [enabled, isPresenter]);

	// ── Presenter: broadcast navigation changes ─────────────────────────────

	useEffect(() => {
		if (!isPresenter) return;
		if (currentSlide === undefined || currentStep === undefined) return;

		presenterRouteRef.current = {
			slide: currentSlide,
			step: currentStep,
		};

		if (!enabled) return;

		channelRef.current?.postMessage({
			type: "navigate",
			slide: currentSlide,
			step: currentStep,
		} satisfies SyncMessage);
	}, [enabled, isPresenter, currentSlide, currentStep]);

	return { presenterConnected };
}
