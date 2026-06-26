/**
 * Deck — root presentation component.
 *
 * Renders ALL slides in the DOM simultaneously and shows the current one
 * determined by the URL hash router. Non-current slides are hidden via
 * `opacity: 0` + `visibility: hidden`; a 200ms CSS crossfade makes slide
 * changes smooth. The `visibility` transition is delayed by 200ms on hide
 * so the outgoing slide remains painted during the opacity fade-out,
 * preventing a black flicker from the container background showing through.
 *
 * ### Phase 5 additions
 * - Routes to `<PresenterView>` when hash is `#/presenter/…`
 * - Overlay with `<OverviewView>` when overview mode is toggled
 * - `<NavBar>` always present (auto-hides on desktop, visible on touch)
 * - `useSwipeNav` for touch devices
 * - `useSync` for BroadcastChannel fallback and `usePresentationReceiverSync` for Presentation API receiver sync
 * - Manual color mode override (system / light / dark) via NavBar
 *
 * ### Viewport scaling
 * The base canvas is 1920 × 1080 px; `transform: scale()` shrinks it
 * uniformly to fit any screen size without distorting content.
 *
 * ### Architecture note
 * Slide data (metadata, components, layout resolution) is now imported from
 * `./slideData.ts` which is also used by PresenterView and OverviewView.
 */

import { config } from "virtual:honeydeck/config";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	applyHoneydeckColorMode,
	resolveEffectiveColorMode,
} from "./colorMode.ts";
import type { ColorMode } from "./components/ColorModeCycleButton.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { NavBar } from "./components/NavBar.tsx";
import { SlideNumberBadge } from "./components/SlideNumberBadge.tsx";
import {
	type EffectiveColorMode,
	EffectiveColorModeProvider,
} from "./EffectiveColorModeContext.tsx";
import { rememberSlideRoute } from "./lastSlideRoute.ts";
import {
	closeOverview,
	toggleOverview as toggleOverviewRoute,
} from "./navigation.ts";
import { usePresentationReceiverSync } from "./presentationApi.ts";
import { useRoute } from "./router.ts";
import { SlideScaleProvider } from "./SlideScaleContext.tsx";
import {
	BASE_HEIGHT,
	BASE_WIDTH,
	resolveLayout,
	slideData,
} from "./slideData.ts";
import { useSync } from "./sync.ts";
import { TimelineProvider } from "./TimelineContext.tsx";
import { useKeyboardNav } from "./useKeyboardNav.ts";
import { useSwipeNav } from "./useSwipeNav.ts";
import { DocsView } from "./views/DocsView.tsx";
import { OverviewView } from "./views/OverviewView.tsx";
import { PresenterView } from "./views/PresenterView.tsx";

// ---------------------------------------------------------------------------
// Scale calculation
// ---------------------------------------------------------------------------

/**
 * Compute the scale from the stage element's actual dimensions.
 * The stage fills the viewport, so its size equals the viewport size.
 */
function calcScaleFromElement(el: HTMLElement | null): number | null {
	if (!el?.isConnected || el.clientWidth <= 0 || el.clientHeight <= 0) {
		return null;
	}
	return Math.min(el.clientWidth / BASE_WIDTH, el.clientHeight / BASE_HEIGHT);
}

type SlideTransitionState = {
	from: number;
	to: number;
	name: string;
	className: string;
	duration: number;
	easing: string;
	direction: 1 | -1;
	enterFromOpacity: number;
	exitFromOpacity: number;
};

function normalizeTransitionName(value: unknown): string {
	if (value === false) return "none";
	if (value === true || value == null) return "fade";
	if (typeof value !== "string") return "fade";

	const name = value.trim();
	if (!name) return "fade";
	if (name === "true") return "fade";
	if (name === "false") return "none";
	return name;
}

function normalizeTransitionDuration(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return Math.max(0, Math.round(value));
}

function normalizeTransitionEasing(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const easing = value.trim();
	return easing ? easing : null;
}

function transitionClassName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function readLayerOpacity(
	element: HTMLElement | null | undefined,
): number | null {
	if (!element) return null;
	const opacity = Number.parseFloat(window.getComputedStyle(element).opacity);
	return Number.isFinite(opacity) ? opacity : null;
}

function getTransitionOptions(
	slideIndex: number,
): Omit<
	SlideTransitionState,
	"from" | "to" | "direction" | "enterFromOpacity" | "exitFromOpacity"
> {
	const frontmatter = slideData[slideIndex]?.frontmatter ?? {};
	const name = normalizeTransitionName(
		frontmatter.transition ?? config.transition,
	);
	const duration =
		normalizeTransitionDuration(frontmatter.transitionDuration) ??
		normalizeTransitionDuration(config.transitionDuration) ??
		200;
	const easing =
		normalizeTransitionEasing(frontmatter.transitionEasing) ??
		normalizeTransitionEasing(config.transitionEasing) ??
		"ease";

	return {
		name,
		className: transitionClassName(name),
		duration,
		easing,
	};
}

type MagicElementRecord = {
	element: HTMLElement;
	rect: DOMRect;
};

function collectMagicElements(layer: HTMLElement): Map<string, MagicElementRecord> {
	const records = new Map<string, MagicElementRecord>();
	for (const element of layer.querySelectorAll<HTMLElement>("[data-magic-id]")) {
		const id = element.dataset.magicId?.trim();
		if (!id || records.has(id)) continue;
		const rect = element.getBoundingClientRect();
		if (rect.width <= 0 && rect.height <= 0) continue;
		records.set(id, { element, rect });
	}
	return records;
}

function copyComputedStyles(source: Element, target: Element) {
	const computed = window.getComputedStyle(source);
	const targetElement = target as HTMLElement;
	for (let index = 0; index < computed.length; index += 1) {
		const property = computed.item(index);
		targetElement.style.setProperty(
			property,
			computed.getPropertyValue(property),
			computed.getPropertyPriority(property),
		);
	}

	const sourceChildren = Array.from(source.children);
	const targetChildren = Array.from(target.children);
	for (let index = 0; index < sourceChildren.length; index += 1) {
		const sourceChild = sourceChildren[index];
		const targetChild = targetChildren[index];
		if (sourceChild && targetChild) copyComputedStyles(sourceChild, targetChild);
	}
}

function createMagicClone(
	record: MagicElementRecord,
	overlay: HTMLElement,
	activeSlideScale: number,
) {
	const scale = activeSlideScale || 1;
	const clone = record.element.cloneNode(true) as HTMLElement;
	copyComputedStyles(record.element, clone);
	clone.removeAttribute("id");
	clone.setAttribute("aria-hidden", "true");
	clone.style.position = "fixed";
	clone.style.left = `${record.rect.left}px`;
	clone.style.top = `${record.rect.top}px`;
	clone.style.width = `${record.rect.width / scale}px`;
	clone.style.height = `${record.rect.height / scale}px`;
	clone.style.margin = "0";
	clone.style.pointerEvents = "none";
	clone.style.transformOrigin = "top left";
	clone.style.transform = `scale(${scale})`;
	clone.style.willChange = "transform, opacity";
	if (window.getComputedStyle(record.element).display === "inline") {
		clone.style.display = "inline-block";
	}
	overlay.appendChild(clone);

	const cloneRect = clone.getBoundingClientRect();
	const left = record.rect.left + (record.rect.left - cloneRect.left);
	const top = record.rect.top + (record.rect.top - cloneRect.top);
	clone.style.left = `${left}px`;
	clone.style.top = `${top}px`;
	return { clone, left, top };
}

function runMagicTransition({
	fromLayer,
	toLayer,
	duration,
	easing,
	activeSlideScale,
}: {
	fromLayer: HTMLElement;
	toLayer: HTMLElement;
	duration: number;
	easing: string;
	activeSlideScale: number;
}) {
	const fromRecords = collectMagicElements(fromLayer);
	const toRecords = collectMagicElements(toLayer);
	const hiddenOriginals: Array<{ element: HTMLElement; opacity: string }> = [];
	const animations: Animation[] = [];
	const overlay = document.createElement("div");
	overlay.className = "honeydeck-magic-transition-overlay";
	overlay.setAttribute("aria-hidden", "true");
	document.body.appendChild(overlay);

	function hideOriginal(element: HTMLElement) {
		hiddenOriginals.push({ element, opacity: element.style.opacity });
		element.style.opacity = "0";
	}

	for (const record of fromRecords.values()) hideOriginal(record.element);
	for (const record of toRecords.values()) hideOriginal(record.element);

	const scale = activeSlideScale || 1;
	const allIds = new Set([...fromRecords.keys(), ...toRecords.keys()]);
	for (const id of allIds) {
		const from = fromRecords.get(id);
		const to = toRecords.get(id);
		if (from && to) {
			const { clone, left, top } = createMagicClone(to, overlay, scale);
			const x = from.rect.left - left;
			const y = from.rect.top - top;
			const scaleX = to.rect.width > 0 ? from.rect.width / to.rect.width : 1;
			const scaleY = to.rect.height > 0 ? from.rect.height / to.rect.height : 1;
			animations.push(
				clone.animate(
					[
						{
							transform: `translate(${x}px, ${y}px) scale(${scale * scaleX}, ${scale * scaleY})`,
							opacity: 1,
						},
						{ transform: `translate(0, 0) scale(${scale})`, opacity: 1 },
					],
					{ duration, easing, fill: "both" },
				),
			);
			continue;
		}

		if (from) {
			const { clone } = createMagicClone(from, overlay, scale);
			animations.push(
				clone.animate(
					[
						{ transform: `scale(${scale})`, opacity: 1 },
						{ transform: `scale(${scale})`, opacity: 0 },
					],
					{ duration, easing, fill: "both" },
				),
			);
			continue;
		}

		if (to) {
			const { clone } = createMagicClone(to, overlay, scale);
			animations.push(
				clone.animate(
					[
						{ transform: `scale(${scale})`, opacity: 0 },
						{ transform: `scale(${scale})`, opacity: 1 },
					],
					{ duration, easing, fill: "both" },
				),
			);
		}
	}

	let cleaned = false;
	function cleanup() {
		if (cleaned) return;
		cleaned = true;
		for (const animation of animations) animation.cancel();
		for (const { element, opacity } of hiddenOriginals) {
			element.style.opacity = opacity;
		}
		overlay.remove();
	}

	const timeout = window.setTimeout(cleanup, duration);
	void Promise.allSettled(animations.map((animation) => animation.finished)).then(
		cleanup,
	);
	return () => {
		window.clearTimeout(timeout);
		cleanup();
	};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Deck() {
	const stageRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const [slideZoom, setSlideZoom] = useState(1);
	const [slidePan, setSlidePan] = useState({ x: 0, y: 0 });
	const [navBarToggleSignal, setNavBarToggleSignal] = useState(0);
	const [slideTextSelectionEnabled, setSlideTextSelectionEnabled] =
		useState(false);
	// GAP-04: initialize colorMode from config.colorMode (spec: deck can pin mode)
	const [colorMode, setColorMode] = useState<ColorMode>(() => {
		const c = config.colorMode;
		if (c === "light" || c === "dark") return c;
		return "system";
	});
	const [effectiveColorMode, setEffectiveColorMode] =
		useState<EffectiveColorMode>("light");
	const [reducedMotion, setReducedMotion] = useState(false);

	const route = useRoute();
	const pointerLayout = usePointerLayout();

	// ── All hooks MUST be called unconditionally (React rules of hooks) ────
	// Previously these were guarded by early returns which violated hook rules.
	// Now all hooks run on every render; reference/presenter modes simply ignore them.

	// ── Color mode: apply data-honeydeck-color-mode to <html> ──────────────────
	useLayoutEffect(() => {
		function applyMode(darkFromSystem: boolean) {
			const mode = resolveEffectiveColorMode(colorMode, darkFromSystem);
			applyHoneydeckColorMode(mode);
			setEffectiveColorMode(mode);
		}

		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		applyMode(mq.matches);

		const onChange = (e: MediaQueryListEvent) => applyMode(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [colorMode]);

	// ── Reduced motion: disable slide transition animations ────────────────
	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(mq.matches);

		const onChange = (event: MediaQueryListEvent) =>
			setReducedMotion(event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	// ── Observe stage size → recalculate scale ─────────────────────────────
	useEffect(() => {
		if (route.view !== "slide" && route.view !== "overview") return;

		const el = stageRef.current;
		if (!el) return;

		function updateScale() {
			const nextScale = calcScaleFromElement(el);
			if (nextScale !== null) setScale(nextScale);
		}

		const ro = new ResizeObserver(updateScale);
		ro.observe(el);
		updateScale();
		return () => ro.disconnect();
	}, [route.view]);

	// ── Remember latest audience slide for returning from reference pages ───
	useEffect(() => {
		if (route.view !== "slide") return;

		rememberSlideRoute({
			view: "slide",
			slide: Math.max(1, Math.min(route.slide, slideData.length || 1)),
			step: Math.max(0, route.step),
		});
	}, [route]);

	// ── Audience sync: BroadcastChannel + Presentation API receiver ──────
	const [blankScreen, setBlankScreen] = useState<"black" | null>(null);
	const handleBlankScreen = useCallback(
		(mode: "black" | "off") =>
			setBlankScreen(mode === "black" ? "black" : null),
		[],
	);
	useSync({
		enabled: route.view === "slide" || route.view === "overview",
		isPresenter: false,
		onSetColorMode: setColorMode,
		onBlankScreen: handleBlankScreen,
	});
	usePresentationReceiverSync({
		enabled: route.view === "slide" || route.view === "overview",
		onSetColorMode: setColorMode,
		onBlankScreen: handleBlankScreen,
	});

	const resetZoom = useCallback(() => {
		setSlideZoom(1);
		setSlidePan({ x: 0, y: 0 });
	}, []);

	function clampPan(nextPan: { x: number; y: number }, zoom = slideZoom) {
		const maxX = (BASE_WIDTH * scale * Math.max(0, zoom - 1)) / 2;
		const maxY = (BASE_HEIGHT * scale * Math.max(0, zoom - 1)) / 2;
		return {
			x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
			y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
		};
	}

	// ── Touch swipe/tap/pinch navigation ────────────────────────────────────
	useSwipeNav({
		enabled: route.view === "slide" && !slideTextSelectionEnabled,
		zoom: slideZoom,
		boundaryRef: stageRef,
		onToggleNavBar: () => setNavBarToggleSignal((value) => value + 1),
		onZoomChange: (zoom) => {
			setSlideZoom(zoom);
			setSlidePan((pan) => clampPan(pan, zoom));
		},
		onResetZoom: resetZoom,
		onPanBy: ({ dx, dy }) => {
			setSlidePan((pan) => clampPan({ x: pan.x + dx, y: pan.y + dy }));
		},
	});

	const getStepCount = useCallback(
		(slideIndex: number): number => slideData[slideIndex]?.stepCount ?? 0,
		[],
	);

	const isOverview = route.view === "overview";
	const toggleOverview = useCallback(
		() =>
			toggleOverviewRoute(route, {
				slideCount: slideData.length,
				getStepCount,
			}),
		[route, getStepCount],
	);

	useKeyboardNav({
		enabled: route.view === "slide",
		slideCount: slideData.length,
		getStepCount,
		onToggleOverview: toggleOverview,
		isOverview,
	});

	const routePositionRef = useRef(`${route.slide}/${route.step}`);
	// Slide/step navigation resets Honeydeck-controlled slide zoom.
	useEffect(() => {
		const routePosition = `${route.slide}/${route.step}`;
		if (routePositionRef.current === routePosition) return;
		routePositionRef.current = routePosition;
		resetZoom();
	}, [resetZoom, route.slide, route.step]);

	useEffect(() => {
		setSlidePan((pan) => {
			const maxX = (BASE_WIDTH * scale * Math.max(0, slideZoom - 1)) / 2;
			const maxY = (BASE_HEIGHT * scale * Math.max(0, slideZoom - 1)) / 2;
			return {
				x: Math.max(-maxX, Math.min(maxX, pan.x)),
				y: Math.max(-maxY, Math.min(maxY, pan.y)),
			};
		});
	}, [scale, slideZoom]);

	const currentSlide = Math.max(
		1,
		Math.min(route.slide, slideData.length || 1),
	);
	const previousSlideRef = useRef<number | null>(null);
	const slideLayerRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const [slideTransition, setSlideTransition] =
		useState<SlideTransitionState | null>(null);
	const slideTransitionRef = useRef<SlideTransitionState | null>(null);
	slideTransitionRef.current = slideTransition;

	useLayoutEffect(() => {
		if (route.view !== "slide") {
			previousSlideRef.current = currentSlide;
			setSlideTransition(null);
			return;
		}

		if (reducedMotion) {
			previousSlideRef.current = currentSlide;
			setSlideTransition(null);
			return;
		}

		const previousSlide = previousSlideRef.current;
		if (previousSlide === null) {
			previousSlideRef.current = currentSlide;
			return;
		}
		if (previousSlide === currentSlide) return;

		const direction: 1 | -1 = currentSlide > previousSlide ? 1 : -1;
		const rawOptions = getTransitionOptions(currentSlide - 1);
		const options =
			rawOptions.name === "magic" && direction === -1
				? { ...rawOptions, name: "fade", className: "fade" }
				: rawOptions;
		previousSlideRef.current = currentSlide;

		if (options.name === "none" || options.duration === 0) {
			setSlideTransition(null);
			return;
		}

		const activeTransition = slideTransitionRef.current;
		const isInterruptingFade = activeTransition?.name === "fade";
		const nextTransition = {
			...options,
			from: previousSlide,
			to: currentSlide,
			direction,
			enterFromOpacity: isInterruptingFade
				? (readLayerOpacity(slideLayerRefs.current[currentSlide]) ?? 0)
				: 0,
			exitFromOpacity: isInterruptingFade
				? (readLayerOpacity(slideLayerRefs.current[previousSlide]) ?? 1)
				: 1,
		};
		setSlideTransition(nextTransition);

		const timeout = window.setTimeout(() => {
			setSlideTransition((active) =>
				active?.from === nextTransition.from && active.to === nextTransition.to
					? null
					: active,
			);
		}, options.duration);

		return () => window.clearTimeout(timeout);
	}, [currentSlide, reducedMotion, route.view]);

	const activeSlideScale = scale * slideZoom;

	useLayoutEffect(() => {
		if (route.view !== "slide") return;
		if (slideTransition?.name !== "magic" || slideTransition.direction !== 1) {
			return;
		}
		const fromLayer = slideLayerRefs.current[slideTransition.from];
		const toLayer = slideLayerRefs.current[slideTransition.to];
		if (!fromLayer || !toLayer) return;

		return runMagicTransition({
			fromLayer,
			toLayer,
			duration: slideTransition.duration,
			easing: slideTransition.easing,
			activeSlideScale,
		});
	}, [activeSlideScale, route.view, slideTransition]);

	// ── Reference mode: delegate to DocsView ─────────────────────────────
	if (route.view === "kit") {
		return (
			<DocsView
				tab={route.kitTab}
				colorMode={colorMode}
				onSetColorMode={setColorMode}
			/>
		);
	}

	// ── Presenter mode: delegate to PresenterView ──────────────────────────
	if (route.view === "presenter") {
		return (
			<PresenterView colorMode={colorMode} onSetColorMode={setColorMode} />
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Guard: no slides
	// ─────────────────────────────────────────────────────────────────────────

	if (slideData.length === 0) {
		return (
			<div className="fixed inset-0 flex items-center justify-center bg-void text-white font-sans text-3xl">
				✏️ No slides found — add content to <code>deck.mdx</code>
			</div>
		);
	}

	const currentStep = Math.max(0, route.step);
	const controlRoute =
		route.view === "slide" || route.view === "overview"
			? { ...route, slide: currentSlide, step: currentStep }
			: route;
	const viewportScale = scale || 1;
	const slideTransform = `translate(${slidePan.x}px, ${slidePan.y}px) scale(${activeSlideScale})`;
	const zoomedSlideTransform = `translate(${slidePan.x / viewportScale}px, ${slidePan.y / viewportScale}px) scale(${slideZoom})`;
	const showSlideNumbers = config.showSlideNumbers === true;
	const disableSlideTextSelection =
		route.view === "slide" &&
		pointerLayout.isTouchDevice &&
		!slideTextSelectionEnabled;

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<EffectiveColorModeProvider mode={effectiveColorMode}>
			<div className="fixed inset-0 overflow-hidden bg-black">
				{/* ── Sizing container: fills viewport for scale calc ──────── */}
				<div
					ref={stageRef}
					className={`absolute inset-0 ${disableSlideTextSelection ? "select-none" : ""}`}
				>
					{/* ── Stage backdrop: themed bg at slide size, prevents flicker ──── */}
					<div
						aria-hidden="true"
						className="absolute inset-0 flex items-center justify-center"
					>
						<div
							className="shrink-0 bg-background"
							style={{
								width: BASE_WIDTH,
								height: BASE_HEIGHT,
								transform: `scale(${scale})`,
								transformOrigin: "center center",
							}}
						/>
					</div>

					{/* ── All slides (only current is visible) ──────────────────────── */}
					{slideData.map((data, i) => {
						const slideNumber = i + 1;
						const isCurrent = slideNumber === currentSlide;
						const activeTransition = slideTransition;
						const transitionRole =
							activeTransition?.to === slideNumber
								? "enter"
								: activeTransition?.from === slideNumber
									? "exit"
									: null;
						const isVisible = isCurrent || transitionRole !== null;
						const isMagicTransition = activeTransition?.name === "magic";
						const layerIsOpaque =
							isCurrent || (isMagicTransition && transitionRole === "exit");
						const transitionLayerClass =
							transitionRole && activeTransition
								? `honeydeck-transition-${activeTransition.className} honeydeck-transition-${transitionRole}`
								: "";
						const layerStyle =
							transitionRole && activeTransition
								? ({
										"--honeydeck-transition-duration": `${activeTransition.duration}ms`,
										"--honeydeck-transition-easing": activeTransition.easing,
										"--honeydeck-transition-direction":
											activeTransition.direction,
										"--honeydeck-transition-enter-from-opacity":
											activeTransition.enterFromOpacity,
										"--honeydeck-transition-exit-from-opacity":
											activeTransition.exitFromOpacity,
									} as CSSProperties)
								: undefined;
						const { Component, stepCount, title, frontmatter, layoutName } =
							data;
						const LayoutComponent = resolveLayout(layoutName);

						return (
							<div
								key={data.id}
								aria-hidden={!isCurrent}
								className={`absolute inset-0 flex items-center justify-center ${
									isVisible ? "visible" : "invisible"
								} ${isCurrent ? "pointer-events-auto" : "pointer-events-none"} ${
									transitionRole === "enter"
										? "z-2"
										: transitionRole === "exit"
											? "z-1"
											: isCurrent
												? "z-1"
												: "z-0"
								}`}
							>
								<div
									className="shrink-0 overflow-hidden"
									style={{
										width: BASE_WIDTH,
										height: BASE_HEIGHT,
										transform: `scale(${scale})`,
										transformOrigin: "center center",
									}}
								>
									<div
										ref={(element) => {
											slideLayerRefs.current[slideNumber] = element;
										}}
										className={`honeydeck-slide-layer relative ${
											layerIsOpaque ? "opacity-100" : "opacity-0"
										} ${transitionLayerClass}`}
										style={{
											width: BASE_WIDTH,
											height: BASE_HEIGHT,
											...layerStyle,
										}}
									>
										<TimelineProvider
											stepIndex={isCurrent ? currentStep : 0}
											stepCount={stepCount}
										>
											<SlideScaleProvider scale={activeSlideScale}>
												<div
													className="honeydeck-slide-canvas shrink-0 relative overflow-hidden box-border"
													style={{
														width: BASE_WIDTH,
														height: BASE_HEIGHT,
														transform: zoomedSlideTransform,
														transformOrigin: "center center",
													}}
												>
													<ErrorBoundary slideNumber={slideNumber}>
														<LayoutComponent
															title={title || null}
															frontmatter={frontmatter}
															rawChildren={<Component />}
														>
															<Component />
														</LayoutComponent>
													</ErrorBoundary>
												</div>
											</SlideScaleProvider>
										</TimelineProvider>
									</div>
								</div>
							</div>
						);
					})}

					{showSlideNumbers && (
						<div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
							<div
								className="honeydeck-slide-number-layer shrink-0 relative"
								style={{
									width: BASE_WIDTH,
									height: BASE_HEIGHT,
									transform: slideTransform,
									transformOrigin: "center center",
								}}
							>
								<SlideNumberBadge slide={currentSlide} />
							</div>
						</div>
					)}
				</div>

				{/* ── Overview overlay ──────────────────────────────────────────── */}
				{isOverview && (
					<OverviewView
						currentSlide={currentSlide}
						currentStep={currentStep}
						onClose={() =>
							closeOverview(controlRoute, {
								slideCount: slideData.length,
								getStepCount,
							})
						}
					/>
				)}

				{/* ── Black screen overlay (controlled by presenter) ────────── */}
				{blankScreen === "black" && (
					<div className="fixed inset-0 bg-black z-[100]" aria-hidden="true" />
				)}

				{/* ── Navigation bar ────────────────────────────────────────────── */}
				{/* GAP-06: showSlideNumbers wired from config */}
				{!isOverview && (
					<NavBarWithHover
						route={controlRoute}
						isOverview={isOverview}
						colorMode={colorMode}
						onToggleOverview={toggleOverview}
						onSetColorMode={setColorMode}
						isZoomed={slideZoom > 1}
						onResetZoom={resetZoom}
						toggleSignal={navBarToggleSignal}
						showTextSelectionToggle={pointerLayout.isTouchDevice}
						isTextSelectionEnabled={slideTextSelectionEnabled}
						onToggleTextSelection={() =>
							setSlideTextSelectionEnabled((value) => !value)
						}
					/>
				)}
			</div>
		</EffectiveColorModeProvider>
	);
}

function usePointerLayout() {
	const [state, setState] = useState(() => {
		if (typeof window === "undefined") {
			return { isTouchDevice: false, isPortrait: false };
		}
		return {
			isTouchDevice: window.matchMedia("(pointer: coarse)").matches,
			isPortrait: window.matchMedia("(orientation: portrait)").matches,
		};
	});

	useEffect(() => {
		const pointerQuery = window.matchMedia("(pointer: coarse)");
		const portraitQuery = window.matchMedia("(orientation: portrait)");
		const update = () => {
			setState({
				isTouchDevice: pointerQuery.matches,
				isPortrait: portraitQuery.matches,
			});
		};
		update();
		pointerQuery.addEventListener("change", update);
		portraitQuery.addEventListener("change", update);
		window.addEventListener("resize", update);
		return () => {
			pointerQuery.removeEventListener("change", update);
			portraitQuery.removeEventListener("change", update);
			window.removeEventListener("resize", update);
		};
	}, []);

	return state;
}

// ---------------------------------------------------------------------------
// NavBarWithHover — handles desktop hover / touch visibility
// ---------------------------------------------------------------------------

function NavBarWithHover(props: {
	route: ReturnType<typeof useRoute>;
	isOverview: boolean;
	colorMode: ColorMode;
	onToggleOverview: () => void;
	onSetColorMode: (m: ColorMode) => void;
	isZoomed: boolean;
	onResetZoom: () => void;
	toggleSignal: number;
	showTextSelectionToggle: boolean;
	isTextSelectionEnabled: boolean;
	onToggleTextSelection: () => void;
}) {
	const [hovered, setHovered] = useState(false);
	const [touchVisible, setTouchVisible] = useState(false);
	const { isTouchDevice, isPortrait } = usePointerLayout();
	const hideTimerRef = useRef<number | null>(null);
	const lastToggleSignalRef = useRef(props.toggleSignal);

	const visible = isTouchDevice
		? isPortrait || touchVisible || props.isTextSelectionEnabled
		: hovered;

	const clearHideTimer = useCallback(() => {
		if (hideTimerRef.current !== null) {
			window.clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	}, []);

	const scheduleHide = useCallback(() => {
		if (!isTouchDevice || isPortrait) return;
		clearHideTimer();
		hideTimerRef.current = window.setTimeout(
			() => setTouchVisible(false),
			3000,
		);
	}, [clearHideTimer, isPortrait, isTouchDevice]);

	useEffect(() => {
		if (lastToggleSignalRef.current === props.toggleSignal) return;
		lastToggleSignalRef.current = props.toggleSignal;
		if (!isTouchDevice || isPortrait) return;
		setTouchVisible((value) => !value);
	}, [props.toggleSignal, isPortrait, isTouchDevice]);

	useEffect(() => {
		if (touchVisible) scheduleHide();
		return clearHideTimer;
	}, [clearHideTimer, scheduleHide, touchVisible]);

	return (
		<>
			{/* Transparent hover zone at bottom of screen */}
			{!isTouchDevice && (
				<div
					aria-hidden="true"
					role="presentation"
					className="fixed bottom-0 left-0 right-0 h-20 z-40 pointer-events-auto"
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
				/>
			)}

			{/* NavBar with opacity transition */}
			<nav
				aria-label="Deck controls"
				className={`transition-opacity duration-200 ease-out z-[150] ${
					visible
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onMouseEnter={() => !isTouchDevice && setHovered(true)}
				onMouseLeave={() => !isTouchDevice && setHovered(false)}
				onPointerDown={scheduleHide}
			>
				<NavBar
					route={props.route}
					isOverview={props.isOverview}
					colorMode={props.colorMode}
					onToggleOverview={props.onToggleOverview}
					onSetColorMode={props.onSetColorMode}
					isZoomed={props.isZoomed}
					onResetZoom={props.onResetZoom}
					showTextSelectionToggle={props.showTextSelectionToggle}
					isTextSelectionEnabled={props.isTextSelectionEnabled}
					onToggleTextSelection={props.onToggleTextSelection}
				/>
			</nav>
		</>
	);
}
