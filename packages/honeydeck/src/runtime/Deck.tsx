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
	useMemo,
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
import {
	HoneydeckProvider,
	resolveHoneydeckConfig,
} from "./HoneydeckContext.tsx";
import { rememberSlideRoute } from "./lastSlideRoute.ts";
import { startMagicTransition } from "./magicTransition.ts";
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
	fromStep: number;
	to: number;
	toStep: number;
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
	| "from"
	| "fromStep"
	| "to"
	| "toStep"
	| "direction"
	| "enterFromOpacity"
	| "exitFromOpacity"
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
	const currentStep = Math.max(0, route.step);
	const previousRouteRef = useRef<{ slide: number; step: number } | null>(null);
	const slideLayerRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const [slideTransition, setSlideTransition] =
		useState<SlideTransitionState | null>(null);
	const slideTransitionRef = useRef<SlideTransitionState | null>(null);
	slideTransitionRef.current = slideTransition;
	const magicTransitionScale = scale * slideZoom;

	useLayoutEffect(() => {
		if (route.view !== "slide") {
			previousRouteRef.current = { slide: currentSlide, step: currentStep };
			setSlideTransition(null);
			return;
		}

		if (reducedMotion) {
			previousRouteRef.current = { slide: currentSlide, step: currentStep };
			setSlideTransition(null);
			return;
		}

		const previousRoute = previousRouteRef.current;
		if (previousRoute === null) {
			previousRouteRef.current = { slide: currentSlide, step: currentStep };
			return;
		}
		if (previousRoute.slide === currentSlide) {
			previousRouteRef.current = { slide: currentSlide, step: currentStep };
			setSlideTransition((active) =>
				active?.to === currentSlide && active.toStep !== currentStep
					? null
					: active,
			);
			return;
		}

		const previousSlide = previousRoute.slide;
		const direction: 1 | -1 = currentSlide > previousSlide ? 1 : -1;
		const rawOptions = getTransitionOptions(currentSlide - 1);
		const options =
			rawOptions.name === "magic" && direction === -1
				? { ...rawOptions, name: "fade", className: "fade" }
				: rawOptions;
		previousRouteRef.current = { slide: currentSlide, step: currentStep };

		if (options.name === "none" || options.duration === 0) {
			setSlideTransition(null);
			return;
		}

		const activeTransition = slideTransitionRef.current;
		const isInterruptingFade = activeTransition?.name === "fade";
		const nextTransition = {
			...options,
			from: previousSlide,
			fromStep: previousRoute.step,
			to: currentSlide,
			toStep: currentStep,
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
	}, [currentSlide, currentStep, reducedMotion, route.view]);

	useLayoutEffect(() => {
		if (!slideTransition || slideTransition.name !== "magic") return;
		return startMagicTransition({
			fromLayer: slideLayerRefs.current[slideTransition.from],
			toLayer: slideLayerRefs.current[slideTransition.to],
			duration: slideTransition.duration,
			easing: slideTransition.easing,
			scale: magicTransitionScale,
			direction: slideTransition.direction,
		});
	}, [magicTransitionScale, slideTransition]);

	const currentSlideData = slideData[currentSlide - 1];
	const honeydeckContextValue = useMemo(
		() => ({
			config: resolveHoneydeckConfig(config),
			currentSlide: {
				index: currentSlide,
				step: currentStep,
				maxSteps: currentSlideData?.stepCount ?? 0,
				layout: currentSlideData?.layoutName ?? "Default",
				layoutProps: currentSlideData?.frontmatter ?? {},
			},
			slideWidth: BASE_WIDTH,
			slideHeight: BASE_HEIGHT,
			mode: effectiveColorMode,
		}),
		[currentSlide, currentStep, currentSlideData, effectiveColorMode],
	);

	// ── Reference mode: delegate to DocsView ─────────────────────────────
	if (route.view === "kit") {
		return (
			<EffectiveColorModeProvider mode={effectiveColorMode}>
				<HoneydeckProvider value={honeydeckContextValue}>
					<DocsView
						tab={route.kitTab}
						colorMode={colorMode}
						onSetColorMode={setColorMode}
					/>
				</HoneydeckProvider>
			</EffectiveColorModeProvider>
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

	const controlRoute =
		route.view === "slide" || route.view === "overview"
			? { ...route, slide: currentSlide, step: currentStep }
			: route;
	const activeSlideScale = scale * slideZoom;
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
			<HoneydeckProvider value={honeydeckContextValue}>
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
							const slideStepIndex =
								transitionRole === "exit" && activeTransition
									? activeTransition.fromStep
									: transitionRole === "enter" && activeTransition
										? activeTransition.toStep
										: isCurrent
											? currentStep
											: 0;
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
												isCurrent ? "opacity-100" : "opacity-0"
											} ${transitionLayerClass}`}
											style={{
												width: BASE_WIDTH,
												height: BASE_HEIGHT,
												...layerStyle,
											}}
										>
											<TimelineProvider
												stepIndex={slideStepIndex}
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
						<div
							className="fixed inset-0 bg-black z-[100]"
							aria-hidden="true"
						/>
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
			</HoneydeckProvider>
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
