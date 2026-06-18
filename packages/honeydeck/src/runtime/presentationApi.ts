import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRouteUrl } from "./navigation.ts";
import { navigate, parseHash, type Route } from "./router.ts";
import {
	createSyncResponseMessage,
	resolveAudienceRouteFromSyncMessage,
	type SyncMessage,
	type SyncNavigateMessage,
	type SyncRequestMessage,
	type SyncResponseMessage,
} from "./sync.ts";

export type PresentationConnectionLike = {
	send?: (message: unknown) => void;
	close?: () => void;
	terminate?: () => void;
	addEventListener?: (
		type: string,
		listener: (event: MessageEvent<unknown>) => void,
	) => void;
	removeEventListener?: (
		type: string,
		listener: (event: MessageEvent<unknown>) => void,
	) => void;
};

type PresentationRequestLike = new (
	presentationUrls: string[],
) => {
	start: () => Promise<PresentationConnectionLike>;
};

type PresentationReceiverLike = {
	connectionList?:
		| PresentationReceiverConnectionListLike
		| Promise<PresentationReceiverConnectionListLike>;
};

type PresentationReceiverConnectionListLike = {
	connections?: PresentationConnectionLike[];
	addEventListener?: (
		type: string,
		listener: (event: { connection?: PresentationConnectionLike }) => void,
	) => void;
	removeEventListener?: (
		type: string,
		listener: (event: { connection?: PresentationConnectionLike }) => void,
	) => void;
	onconnectionavailable?: (event: {
		connection?: PresentationConnectionLike;
	}) => void;
};

type PresentationNavigatorLike = {
	receiver?: PresentationReceiverLike;
};

type PresenterRoute = {
	slide: number;
	step: number;
};

type PresentationWindowLike = Window & {
	PresentationRequest?: PresentationRequestLike;
	navigator: Navigator & {
		presentation?: PresentationNavigatorLike;
	};
};

function getPresentationWindow(): PresentationWindowLike | null {
	if (typeof window === "undefined") return null;
	return window as PresentationWindowLike;
}

function getPresentationRequestConstructor(): PresentationRequestLike | null {
	const request = getPresentationWindow()?.PresentationRequest;
	return typeof request === "function" ? request : null;
}

export function isPresentationApiSupported(): boolean {
	return getPresentationRequestConstructor() !== null;
}

export function getPresentationAudienceUrl(route: Route): string | null {
	if (route.view === "kit") return null;
	return getRouteUrl({ view: "slide", slide: route.slide, step: route.step });
}

function parsePresentationMessage(value: unknown): unknown {
	if (typeof value !== "string") return value;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return value;
	}
}

function sendPresentationMessage(
	connection: PresentationConnectionLike | null,
	message: SyncMessage,
): void {
	if (!connection?.send) return;
	try {
		connection.send(JSON.stringify(message));
	} catch {
		// Presentation API connections may throw if the receiver is gone.
	}
}

function sendPresentationRouteToConnection(
	connection: PresentationConnectionLike | null,
	slide: number,
	step: number,
): void {
	sendPresentationMessage(connection, { type: "navigate", slide, step });
}

function closeConnection(connection: PresentationConnectionLike | null): void {
	if (!connection) return;
	try {
		if (connection.terminate) {
			connection.terminate();
			return;
		}
		connection.close?.();
	} catch {
		try {
			connection.close?.();
		} catch {
			// Ignore connection shutdown errors; the UI is already stopping locally.
		}
	}
}

export function sendPresentationSyncRequest(
	connection: PresentationConnectionLike | null,
): void {
	sendPresentationMessage(connection, { type: "sync-request" });
}

function sendPresentationSyncResponse(
	connection: PresentationConnectionLike | null,
	slide: number,
	step: number,
): void {
	sendPresentationMessage(
		connection,
		createSyncResponseMessage({ slide, step }),
	);
}

type PresentationRouteRef = {
	current: PresenterRoute;
};

type PresentationCastGenerationRef = {
	current: number;
};

export async function startPresentationCast({
	enabled = true,
	supported,
	audienceUrl,
	currentSlide,
	currentStep,
	routeRef,
	requestConstructor,
	connectionRef,
	startInFlightRef,
	castGenerationRef,
	setIsCasting,
}: {
	enabled?: boolean;
	supported: boolean;
	audienceUrl: string | null;
	currentSlide: number;
	currentStep: number;
	routeRef: PresentationRouteRef;
	requestConstructor: PresentationRequestLike | null;
	connectionRef: { current: PresentationConnectionLike | null };
	startInFlightRef: { current: boolean };
	castGenerationRef: PresentationCastGenerationRef;
	setIsCasting: (isCasting: boolean) => void;
}): Promise<void> {
	if (
		!enabled ||
		!supported ||
		!audienceUrl ||
		connectionRef.current ||
		startInFlightRef.current
	) {
		return;
	}

	if (!requestConstructor) return;

	startInFlightRef.current = true;
	const castGeneration = ++castGenerationRef.current;
	try {
		const request = new requestConstructor([audienceUrl]);
		const connection = await request.start();
		if (castGeneration !== castGenerationRef.current) {
			closeConnection(connection);
			return;
		}
		connectionRef.current = connection;
		setIsCasting(true);

		const onMessage = (event: MessageEvent<unknown>) => {
			if (!isSyncRequestMessage(parsePresentationMessage(event.data))) return;
			sendPresentationSyncResponse(
				connection,
				routeRef.current.slide,
				routeRef.current.step,
			);
		};

		const onClose = () => {
			connectionRef.current = null;
			setIsCasting(false);
			connection.removeEventListener?.("message", onMessage);
			connection.removeEventListener?.("close", onClose);
			connection.removeEventListener?.("terminate", onClose);
			connection.removeEventListener?.("statechange", onStateChange);
		};

		const onStateChange = () => {
			const state = (connection as { state?: unknown }).state;
			if (state === "closed" || state === "terminated") onClose();
		};

		connection.addEventListener?.("message", onMessage);
		connection.addEventListener?.("close", onClose);
		connection.addEventListener?.("terminate", onClose);
		connection.addEventListener?.("statechange", onStateChange);

		sendPresentationRouteToConnection(connection, currentSlide, currentStep);
	} catch {
		if (castGeneration !== castGenerationRef.current) {
			return;
		}
		connectionRef.current = null;
		setIsCasting(false);
	} finally {
		startInFlightRef.current = false;
	}
}

export function stopPresentationCast(
	connectionRef: { current: PresentationConnectionLike | null },
	setIsCasting: (isCasting: boolean) => void,
	castGenerationRef?: PresentationCastGenerationRef,
): void {
	if (castGenerationRef) castGenerationRef.current += 1;
	closeConnection(connectionRef.current);
	connectionRef.current = null;
	setIsCasting(false);
}

function getConnectionFromEvent(event: {
	connection?: PresentationConnectionLike;
}) {
	return event.connection ?? null;
}

export function usePresentationReceiverSync({
	enabled = true,
}: {
	enabled?: boolean;
}): void {
	useEffect(() => {
		if (!enabled) return;

		const presentationNavigator =
			getPresentationWindow()?.navigator.presentation;
		const receiver = presentationNavigator?.receiver;
		if (!receiver?.connectionList) return;

		let cancelled = false;
		const connections = new Set<PresentationConnectionLike>();
		const cleanupTasks: Array<() => void> = [];

		function handleMessage(event: MessageEvent<unknown>) {
			const message = parsePresentationMessage(event.data);
			if (cancelled || !isSyncMessage(message)) return;
			const currentRoute = parseHash(location.hash);
			const nextRoute = resolveAudienceRouteFromSyncMessage(
				currentRoute,
				message,
			);
			if (nextRoute) {
				navigate(nextRoute);
			}
		}

		function attachConnection(connection: PresentationConnectionLike | null) {
			if (!connection || connections.has(connection)) return;
			connections.add(connection);
			connection.addEventListener?.("message", handleMessage);
			sendPresentationSyncRequest(connection);
			cleanupTasks.push(() => {
				connection.removeEventListener?.("message", handleMessage);
			});
		}

		function handleConnectionEvent(event: {
			connection?: PresentationConnectionLike;
		}) {
			attachConnection(getConnectionFromEvent(event));
		}

		Promise.resolve(receiver.connectionList)
			.then((connectionList) => {
				if (cancelled) return;
				connectionList.connections?.forEach(attachConnection);
				connectionList.addEventListener?.(
					"connectionavailable",
					handleConnectionEvent,
				);
				cleanupTasks.push(() => {
					connectionList.removeEventListener?.(
						"connectionavailable",
						handleConnectionEvent,
					);
				});
				const previousOnConnectionAvailable =
					connectionList.onconnectionavailable;
				connectionList.onconnectionavailable = handleConnectionEvent;
				cleanupTasks.push(() => {
					if (connectionList.onconnectionavailable === handleConnectionEvent) {
						connectionList.onconnectionavailable =
							previousOnConnectionAvailable;
					}
				});
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			cleanupTasks.splice(0).forEach((cleanup) => {
				cleanup();
			});
			connections.clear();
		};
	}, [enabled]);
}

export function usePresentationCast({
	enabled = true,
	audienceUrl,
	currentSlide,
	currentStep,
}: {
	enabled?: boolean;
	audienceUrl: string | null;
	currentSlide: number;
	currentStep: number;
}): {
	supported: boolean;
	isCasting: boolean;
	startCasting: () => Promise<void>;
	stopCasting: () => void;
} {
	const [isCasting, setIsCasting] = useState(false);
	const isMountedRef = useRef(true);
	const connectionRef = useRef<PresentationConnectionLike | null>(null);
	const startInFlightRef = useRef(false);
	const castGenerationRef = useRef(0);
	const routeRef = useRef<PresenterRoute>({
		slide: currentSlide,
		step: currentStep,
	});
	const supported = isPresentationApiSupported();

	useEffect(() => {
		routeRef.current = {
			slide: currentSlide,
			step: currentStep,
		};
	}, [currentSlide, currentStep]);

	const setCastingState = useCallback((next: boolean) => {
		if (isMountedRef.current) setIsCasting(next);
	}, []);

	const stopCasting = useCallback(() => {
		stopPresentationCast(connectionRef, setCastingState, castGenerationRef);
	}, [setCastingState]);

	const startCasting = useCallback(async () => {
		await startPresentationCast({
			enabled,
			supported,
			audienceUrl,
			currentSlide,
			currentStep,
			routeRef,
			requestConstructor: getPresentationRequestConstructor(),
			connectionRef,
			startInFlightRef,
			castGenerationRef,
			setIsCasting: setCastingState,
		});
	}, [
		audienceUrl,
		currentSlide,
		currentStep,
		enabled,
		supported,
		setCastingState,
	]);

	useEffect(() => {
		if (!isCasting) return;
		sendPresentationRouteToConnection(
			connectionRef.current,
			currentSlide,
			currentStep,
		);
	}, [currentSlide, currentStep, isCasting]);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			stopCasting();
		};
	}, [stopCasting]);

	return useMemo(
		() => ({ supported, isCasting, startCasting, stopCasting }),
		[supported, isCasting, startCasting, stopCasting],
	);
}

function isSyncRequestMessage(value: unknown): value is SyncRequestMessage {
	if (typeof value !== "object" || value === null) return false;
	if (!("type" in value)) return false;
	return (value as SyncMessage).type === "sync-request";
}

function isSyncMessage(
	value: unknown,
): value is SyncNavigateMessage | SyncResponseMessage {
	if (typeof value !== "object" || value === null) return false;
	if (!("type" in value)) return false;
	const type = (value as SyncMessage).type;
	return type === "navigate" || type === "sync-response";
}
