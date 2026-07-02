/**
 * PresenterView — Honeydeck presenter mode.
 *
 * Route: /#/presenter/slideNumber/stepIndex
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  ┌──────────────────────┐  ┌──────────┐  │
 *   │  │                      │  │   Next   │  │
 *   │  │    Current slide     │  │  (small) │  │
 *   │  │    (large)           │  ├──────────┤  │
 *   │  │                      │  │  Notes   │  │
 *   │  └──────────────────────┘  └──────────┘  │
 *   │  Slide 3/12 · Step 2/4  12:34  Timer 1:23 [Open] │
 *   └──────────────────────────────────────────┘
 *
 * ### Notes collection
 * The current slide is rendered inside a `<NotesContext.Provider>`.  Any
 * `<Notes>` component in that slide pushes its children into a state slot
 * via `setNotes`, which is then displayed in the notes area.
 *
 * ### Presenter sync
 * PresenterView is the controller: it broadcasts `navigate` messages whenever
 * its route changes.  Audience windows (`Deck`) listen and follow via
 * BroadcastChannel fallback or Presentation API receiver messages.
 *
 * ### Keyboard navigation
 * `useKeyboardNav` is wired so that arrow keys advance the presenter route
 * (view: 'presenter'), which in turn is broadcast to the audience.
 */

import { config } from "virtual:honeydeck/config";
import {
	ExternalLinkIcon,
	MonitorOffIcon,
	PauseIcon,
	PlayIcon,
	RotateCcwIcon,
	XIcon,
} from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type ColorMode,
	ColorModeCycleButton,
} from "../components/ColorModeCycleButton.tsx";
import { NotesContext } from "../components/Notes.tsx";
import { readDocumentEffectiveColorMode } from "../EffectiveColorModeContext.tsx";
import {
	HoneydeckProvider,
	resolveHoneydeckConfig,
} from "../HoneydeckContext.tsx";
import {
	getSlideRouteFromRoute,
	navigateTo,
	openUrlInNewTab,
} from "../navigation.ts";
import {
	getPresentationAudienceUrl,
	usePresentationCast,
} from "../presentationApi.ts";
import { useRoute } from "../router.ts";
import { SlideCanvas } from "../SlideCanvas.tsx";
import { BASE_HEIGHT, BASE_WIDTH, slideData } from "../slideData.ts";
import { useSync } from "../sync.ts";
import { useKeyboardNav } from "../useKeyboardNav.ts";
import { PresenterCastButton } from "./PresenterCastButton.tsx";
import { PresenterNotesPanel } from "./PresenterNotesPanel.tsx";
import { getPresenterNextPreview } from "./presenterPreview.ts";
import { formatPresenterElapsedTime } from "./presenterTime.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A slide preview scaled to fit a measured container.
 * Uses ResizeObserver so it adjusts when the presenter window is resized.
 */
function SlidePreview({
	slideIndex,
	stepIndex,
	label,
	showFutureSteps,
}: {
	slideIndex: number;
	stepIndex: number;
	label?: string;
	showFutureSteps?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.4);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setScale(Math.min(width / BASE_WIDTH, height / BASE_HEIGHT));
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	if (slideIndex < 0 || slideIndex >= slideData.length) {
		return (
			<div className="flex flex-col gap-1.5 overflow-hidden">
				{label && (
					<div className="text-xs font-semibold text-white/50 tracking-wider uppercase">
						{label}
					</div>
				)}
				<div className="flex-1 bg-white/5 rounded-md flex items-center justify-center text-white/30 text-md italic outline-1 outline-solid outline-white/10">
					No next step
				</div>
			</div>
		);
	}

	const visualW = BASE_WIDTH * scale;
	const visualH = BASE_HEIGHT * scale;

	return (
		<div
			className={[
				"flex flex-col gap-1.5 overflow-hidden",
				"[&_.honeydeck-code-block_.line]:transition-none",
				"[&_.honeydeck-code-block_.line[data-highlight='1']]:animate-none",
			].join(" ")}
		>
			{label && (
				<div className="text-xs font-semibold text-white/50 tracking-wider uppercase">
					{label}
				</div>
			)}
			<div
				ref={containerRef}
				className="flex-1 overflow-hidden rounded-md flex items-center justify-center outline-1 outline-solid outline-white/10"
			>
				<SlideCanvas
					slideIndex={slideIndex}
					stepIndex={stepIndex}
					scale={scale}
					style={{ width: visualW, height: visualH }}
					showFutureSteps={showFutureSteps}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type PresenterViewProps = {
	colorMode: ColorMode;
	onSetColorMode: (mode: ColorMode) => void;
};

export function PresenterView({
	colorMode,
	onSetColorMode,
}: PresenterViewProps) {
	const route = useRoute();
	const totalSlides = slideData.length;
	const slide = Math.max(1, Math.min(route.slide, totalSlides || 1));
	const step = Math.max(0, route.step);

	const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
	const [timerState, setTimerState] = useState<"idle" | "running" | "paused">(
		"idle",
	);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [notes, setNotes] = useState<ReactNode>(null);
	const [isBlankScreen, setIsBlankScreen] = useState(false);
	const notesContextValue = useMemo(() => ({ setNotes }), []);

	const currentIndex = slide - 1; // 0-based
	const currentStepCount = slideData[currentIndex]?.stepCount ?? 0;
	const nextPreview = getPresenterNextPreview({
		currentIndex,
		step,
		stepCount: currentStepCount,
		totalSlides,
	});
	const presentationCast = usePresentationCast({
		audienceUrl: getPresentationAudienceUrl({ view: "slide", slide, step }),
		currentSlide: slide,
		currentStep: step,
		currentColorMode: colorMode,
	});
	const sendCastMessage = presentationCast.sendMessage;
	const elapsedTime = formatPresenterElapsedTime(elapsedSeconds * 1000);
	const effectiveMode =
		colorMode === "light" || colorMode === "dark"
			? colorMode
			: readDocumentEffectiveColorMode();
	const currentSlideData = slideData[currentIndex];
	const honeydeckContextValue = useMemo(
		() => ({
			config: resolveHoneydeckConfig(config),
			currentSlide: {
				index: slide,
				step,
				maxSteps: currentSlideData?.stepCount ?? 0,
				layout: currentSlideData?.layoutName ?? "Default",
				layoutProps: currentSlideData?.frontmatter ?? {},
			},
			mode: effectiveMode,
		}),
		[slide, step, currentSlideData, effectiveMode],
	);

	// ── Wall clock + elapsed timer ─────────────────────────────────────────
	useEffect(() => {
		const timer = setInterval(() => {
			setClock(new Date().toLocaleTimeString());
			if (timerState === "running") setElapsedSeconds((value) => value + 1);
		}, 1000);
		return () => clearInterval(timer);
	}, [timerState]);

	// ── BroadcastChannel: this window IS the presenter (controller) ─────────
	const { broadcastBlankScreen } = useSync({
		isPresenter: true,
		currentSlide: slide,
		currentStep: step,
		currentColorMode: colorMode,
	});

	// ── Keyboard navigation ─────────────────────────────────────────────────
	const getStepCount = useCallback(
		(i: number) => slideData[i]?.stepCount ?? 0,
		[],
	);
	useKeyboardNav({
		slideCount: totalSlides,
		getStepCount,
		onToggleOverview: () => {},
	});

	// ── Presenter exit + blank screen shortcuts ─────────────────────────────
	const closePresenter = useCallback(() => {
		navigateTo(getSlideRouteFromRoute({ view: "presenter", slide, step }));
	}, [slide, step]);

	const toggleBlankScreen = useCallback(() => {
		const next = !isBlankScreen;
		setIsBlankScreen(next);
		const mode = next ? "black" : "off";
		broadcastBlankScreen(mode);
		sendCastMessage({ type: "blank-screen", mode });
	}, [isBlankScreen, broadcastBlankScreen, sendCastMessage]);

	useEffect(() => {
		function handlePresenterKeys(event: KeyboardEvent) {
			if (event.key === "p" || event.key === "Escape") {
				event.preventDefault();
				closePresenter();
				return;
			}

			if (event.key === "b" || event.key === "B") {
				event.preventDefault();
				toggleBlankScreen();
			}
		}

		window.addEventListener("keydown", handlePresenterKeys);
		return () => window.removeEventListener("keydown", handlePresenterKeys);
	}, [closePresenter, toggleBlankScreen]);

	// ── Timer controls ──────────────────────────────────────────────────────
	function startTimer() {
		setTimerState("running");
	}

	function pauseTimer() {
		setTimerState("paused");
	}

	function continueTimer() {
		setTimerState("running");
	}

	function restartTimer() {
		setElapsedSeconds(0);
		setTimerState("running");
	}

	function closeTimer() {
		setElapsedSeconds(0);
		setTimerState("idle");
	}

	// ── Open audience window ────────────────────────────────────────────────
	function openAudienceView() {
		const url = getPresentationAudienceUrl({ view: "slide", slide, step });
		if (url) openUrlInNewTab(url);
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<HoneydeckProvider value={honeydeckContextValue}>
			<div className="fixed inset-0 bg-black text-white font-sans overflow-hidden select-none">
				<div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center md:hidden">
					<div className="max-w-sm space-y-2">
						<h1 className="text-2xl font-semibold">
							Presenter mode is not supported on mobile.
						</h1>
						<p className="text-sm text-white/60">
							Open presenter mode on a larger screen, or return to this slide in
							the audience view.
						</p>
					</div>
					<button
						type="button"
						onClick={closePresenter}
						className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm font-[inherit] text-white/85"
					>
						Go to slide
					</button>
				</div>

				<div className="hidden h-full grid-rows-[1fr_auto] grid-cols-1 md:grid">
					{/* ── Blank screen indicator overlay ────────────────────────────── */}
					{isBlankScreen && (
						<div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-md bg-red-600/90 text-white text-sm font-semibold tracking-wide uppercase">
							Screen blanked (b)
						</div>
					)}

					{/* ── Top section: current slide plus next/notes column ─────────── */}
					<div className="grid grid-cols-[minmax(0,3fr)_minmax(280px,2fr)] gap-4 px-4 pt-4 pb-2 min-h-0 overflow-hidden">
						{/* Current slide owns NotesContext. Next preview must not overwrite notes. */}
						<NotesContext.Provider value={notesContextValue}>
							<SlidePreview
								slideIndex={currentIndex}
								stepIndex={step}
								label="Current"
							/>
						</NotesContext.Provider>

						<div className="grid grid-rows-[minmax(0,1fr)_minmax(8rem,0.8fr)] gap-4 min-h-0 overflow-hidden">
							<SlidePreview
								slideIndex={nextPreview?.slideIndex ?? -1}
								stepIndex={nextPreview?.stepIndex ?? 0}
								label="Next"
								showFutureSteps
							/>
							<PresenterNotesPanel notes={notes} />
						</div>
					</div>

					{/* ── Bottom bar: counter · timer/actions ──────────────────────── */}
					<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center px-5 py-2.5 border-t border-white/8 bg-black/30 gap-x-4 gap-y-2">
						{/* Counter + timer */}
						<div className="min-w-0 flex flex-wrap items-center gap-3 text-md text-white/60 tabular-nums">
							<span className="truncate">
								Slide {slide}/{totalSlides}
								{currentStepCount > 0 && ` · Step ${step}/${currentStepCount}`}
							</span>
							{timerState === "idle" && (
								<button
									type="button"
									onClick={startTimer}
									title="Start timer"
									className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/6 text-white/50 hover:text-white/80 text-sm"
								>
									<PlayIcon aria-hidden="true" size={14} />
									Start timer
								</button>
							)}
							{timerState === "running" && (
								<>
									<button
										type="button"
										onClick={pauseTimer}
										title="Pause timer"
										className="text-lg font-semibold text-white tabular-nums bg-white/10 px-2.5 py-0.5 rounded"
									>
										⏱ {elapsedTime}
									</button>
									<button
										type="button"
										onClick={pauseTimer}
										title="Pause timer"
										aria-label="Pause timer"
										className="text-white/50 hover:text-white/80 inline-flex"
									>
										<PauseIcon aria-hidden="true" size={16} />
									</button>
								</>
							)}
							{timerState === "paused" && (
								<>
									<span className="text-lg font-semibold text-white/60 tabular-nums bg-white/6 px-2.5 py-0.5 rounded">
										⏱ {elapsedTime}
									</span>
									<button
										type="button"
										onClick={continueTimer}
										title="Continue timer"
										aria-label="Continue timer"
										className="text-white/50 hover:text-white/80 inline-flex"
									>
										<PlayIcon aria-hidden="true" size={16} />
									</button>
									<button
										type="button"
										onClick={restartTimer}
										title="Restart timer from zero"
										aria-label="Restart timer from zero"
										className="text-white/30 hover:text-white/60 inline-flex"
									>
										<RotateCcwIcon aria-hidden="true" size={15} />
									</button>
									<button
										type="button"
										onClick={closeTimer}
										title="Close timer"
										aria-label="Close timer"
										className="text-white/30 hover:text-white/60 inline-flex"
									>
										<XIcon aria-hidden="true" size={16} />
									</button>
								</>
							)}
						</div>

						{/* Clock + mode/open/cast buttons */}
						<div className="flex flex-wrap gap-3 items-center justify-self-end">
							<span
								className="text-md tabular-nums text-white/60"
								title="Wall clock"
							>
								{clock}
							</span>
							<ColorModeCycleButton
								colorMode={colorMode}
								onSetColorMode={onSetColorMode}
								iconSize={14}
								className="w-8 h-8 rounded border border-white/20 bg-white/6 text-white/80 inline-flex items-center justify-center"
							/>
							<NavButton
								onClick={toggleBlankScreen}
								title={
									isBlankScreen ? "Unblank screen (b)" : "Blank screen (b)"
								}
							>
								<MonitorOffIcon
									aria-hidden="true"
									size={16}
									className={isBlankScreen ? "text-red-400" : ""}
								/>
							</NavButton>
							<button
								type="button"
								onClick={openAudienceView}
								className="px-3 py-1 rounded border border-white/20 bg-white/6 text-white/80 text-sm font-[inherit] inline-flex items-center gap-1.5"
							>
								Open audience view
								<ExternalLinkIcon aria-hidden="true" size={14} />
							</button>
							<PresenterCastButton
								supported={presentationCast.supported}
								isCasting={presentationCast.isCasting}
								onStartCasting={presentationCast.startCasting}
								onStopCasting={presentationCast.stopCasting}
							/>
						</div>
					</div>
				</div>
			</div>
		</HoneydeckProvider>
	);
}

// ---------------------------------------------------------------------------
// Small inline button component
// ---------------------------------------------------------------------------

function NavButton({
	onClick,
	title,
	className,
	children,
}: {
	onClick: () => void;
	title?: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			title={title}
			aria-label={title}
			className={`w-9 h-9 rounded border border-white/15 bg-white/6 text-white/75 text-md flex items-center justify-center font-[inherit] ${className ?? ""}`}
		>
			{children}
		</button>
	);
}
