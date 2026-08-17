import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { SlideCanvas } from "../deck/SlideCanvas.tsx";
import {
	BASE_HEIGHT,
	BASE_WIDTH,
	isSlideHidden,
	slideData,
} from "../deck/slideData.ts";
import {
	type HotkeyDefinition,
	handleHotkeyEvent,
} from "../navigation/hotkeys.ts";
import { navigate } from "../navigation/router.ts";
import {
	findNearestListedPosition,
	getOverviewGridColumnCount,
	getOverviewGridSelectionMove,
} from "./overviewGrid.ts";

const DESKTOP_THUMB_W = 360;
const SELECTION_SCROLL_MARGIN = 96;
const SELECTION_SCROLL_DURATION_MS = 180;
const MOBILE_COLUMNS = 2;
const MOBILE_PADDING = 16;
const MOBILE_GAP = 12;

type BoundaryFeedback = {
	direction: "up" | "down";
	key: number;
	/** 0-based slide index the feedback belongs to. */
	selected: number;
};

type SelectionState = {
	/** 0-based slide index of the selected thumbnail. */
	selected: number;
	boundaryFeedback: BoundaryFeedback | null;
};

type SelectionSource = "keyboard" | "direct";

export type OverviewViewProps = {
	/** 1-based number of the slide encoded by the overview route. */
	currentSlide: number;
	/** 0-based step remembered by the overview route for returning to slides. */
	currentStep: number;
	/** Called when the overview should close. */
	onClose: () => void;
	/** Optional extra className applied to the root panel. */
	className?: string;
	/**
	 * Route view to use when jumping to a selected slide.
	 * @default "slide"
	 */
	targetView?: "slide" | "presenter";
};

export function OverviewView({
	currentSlide,
	currentStep,
	onClose,
	className = "",
	targetView = "slide",
}: OverviewViewProps) {
	const [selectionState, setSelectionState] = useState<SelectionState>({
		selected: Math.max(0, currentSlide - 1),
		boundaryFeedback: null,
	});
	const { boundaryFeedback } = selectionState;
	// Opening overview on a hidden slide lists hidden slides right away so the
	// `Current` badge stays visible.
	const [showHiddenSlides, setShowHiddenSlides] = useState(() =>
		isSlideHidden(currentSlide - 1),
	);
	const [viewportWidth, setViewportWidth] = useState(() =>
		typeof window === "undefined" ? 1024 : window.innerWidth,
	);
	const isMobile = useOverviewMobile();
	const selectionSourceRef = useRef<SelectionSource>("direct");
	const containerRef = useRef<HTMLDivElement>(null);
	const gridRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<HTMLDivElement | null>(null);
	const colsRef = useRef(1);

	const listedSlides = useMemo(
		() =>
			slideData
				.map((slide, index) => ({ slide, index }))
				.filter((entry) => showHiddenSlides || !entry.slide.hidden),
		[showHiddenSlides],
	);
	const listedSlideIndexes = useMemo(
		() => listedSlides.map((entry) => entry.index),
		[listedSlides],
	);
	const listedCount = listedSlides.length;
	const hiddenCount = slideData.filter((slide) => slide.hidden).length;
	const selectedPosition = findNearestListedPosition(
		listedSlideIndexes,
		selectionState.selected,
	);
	// Selection follows the listed thumbnails, so hiding hidden slides again
	// moves the selection to the nearest listed thumbnail.
	const selected = listedSlideIndexes[selectedPosition] ?? -1;

	const gap = isMobile ? MOBILE_GAP : 48;
	const thumbW = isMobile
		? Math.max(
				1,
				(viewportWidth - MOBILE_PADDING * 2 - gap * (MOBILE_COLUMNS - 1)) /
					MOBILE_COLUMNS,
			)
		: DESKTOP_THUMB_W;
	const canvasW = thumbW;
	const canvasH = canvasW * (BASE_HEIGHT / BASE_WIDTH);
	const thumbScale = canvasW / BASE_WIDTH;

	useEffect(() => {
		containerRef.current?.focus();
	}, []);

	useEffect(() => {
		const routeSelected = Math.max(0, currentSlide - 1);
		selectionSourceRef.current = "direct";
		setSelectionState({ selected: routeSelected, boundaryFeedback: null });
		if (isSlideHidden(routeSelected)) setShowHiddenSlides(true);
	}, [currentSlide]);

	useEffect(() => {
		const update = () => setViewportWidth(window.innerWidth);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	useEffect(() => {
		const container = containerRef.current;
		const selectedElement = selectedRef.current;
		if (selected < 0 || !container || !selectedElement) return;

		const scrollContainer = container;
		const startTop = scrollContainer.scrollTop;
		const targetTop = getScrollTopForNearestElement(
			scrollContainer,
			selectedElement,
			SELECTION_SCROLL_MARGIN,
		);
		const distance = targetTop - startTop;

		if (Math.abs(distance) < 1 || getReducedMotionPreference()) {
			container.scrollTop = targetTop;
			return;
		}

		const startTime = performance.now();
		let animationFrame = 0;

		function animate(now: number) {
			const progress = Math.min(
				1,
				(now - startTime) / SELECTION_SCROLL_DURATION_MS,
			);
			scrollContainer.scrollTop = startTop + distance * easeOutCubic(progress);

			if (progress < 1) animationFrame = requestAnimationFrame(animate);
		}

		animationFrame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationFrame);
	}, [selected]);

	const jumpTo = useCallback(
		(index: number) => {
			if (index === currentSlide - 1) {
				// Selecting the already-current slide exits the overview and keeps
				// the current slide and step instead of resetting to step 0.
				navigate({
					view: targetView,
					slide: currentSlide,
					step: currentStep,
				});
				return;
			}
			navigate({ view: targetView, slide: index + 1, step: 0 });
		},
		[currentSlide, currentStep, targetView],
	);

	const updateColumnCount = useCallback(() => {
		colsRef.current = getOverviewGridColumnCount(gridRef.current);
		return colsRef.current;
	}, []);

	useEffect(() => {
		updateColumnCount();

		const grid = gridRef.current;
		if (!grid) return;

		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", updateColumnCount);
			return () => window.removeEventListener("resize", updateColumnCount);
		}

		const resizeObserver = new ResizeObserver(() => updateColumnCount());
		resizeObserver.observe(grid);
		return () => resizeObserver.disconnect();
	}, [updateColumnCount]);

	function setSelectedFrom(source: SelectionSource, index: number) {
		selectionSourceRef.current = source;
		setSelectionState({ selected: index, boundaryFeedback: null });
	}

	function moveSelection(
		direction: Parameters<typeof getOverviewGridSelectionMove>[3],
	) {
		const columns = updateColumnCount();
		selectionSourceRef.current = "keyboard";

		setSelectionState((state) => {
			const position = findNearestListedPosition(
				listedSlideIndexes,
				state.selected,
			);
			const move = getOverviewGridSelectionMove(
				position,
				listedCount,
				columns,
				direction,
			);
			const nextSelected = listedSlideIndexes[move.selected] ?? state.selected;

			if (!move.didMove && direction === "ArrowUp") {
				return {
					selected: nextSelected,
					boundaryFeedback: {
						direction: "up",
						key: (state.boundaryFeedback?.key ?? 0) + 1,
						selected: nextSelected,
					},
				};
			}

			if (!move.didMove && direction === "ArrowDown") {
				return {
					selected: nextSelected,
					boundaryFeedback: {
						direction: "down",
						key: (state.boundaryFeedback?.key ?? 0) + 1,
						selected: nextSelected,
					},
				};
			}

			return { selected: nextSelected, boundaryFeedback: null };
		});
	}

	function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		const hotkeys: HotkeyDefinition[] = [
			{
				id: "overview.selection.move-right",
				name: "Move overview selection right",
				description: "Move the selected overview thumbnail to the right.",
				keys: ["ArrowRight"],
				handler: () => moveSelection("ArrowRight"),
			},
			{
				id: "overview.selection.move-left",
				name: "Move overview selection left",
				description: "Move the selected overview thumbnail to the left.",
				keys: ["ArrowLeft"],
				handler: () => moveSelection("ArrowLeft"),
			},
			{
				id: "overview.selection.move-down",
				name: "Move overview selection down",
				description: "Move the selected overview thumbnail down.",
				keys: ["ArrowDown"],
				handler: () => moveSelection("ArrowDown"),
			},
			{
				id: "overview.selection.move-up",
				name: "Move overview selection up",
				description: "Move the selected overview thumbnail up.",
				keys: ["ArrowUp"],
				handler: () => moveSelection("ArrowUp"),
			},
			{
				id: "overview.timeline-keys.disabled",
				name: "Disable timeline keys in overview",
				description: "Keep WASD timeline shortcuts inactive in overview mode.",
				keys: ["w", "a", "s", "d"],
				handler: () => {},
			},
			{
				id: "overview.selection.open",
				name: "Open selected slide",
				description: "Jump to the currently selected overview thumbnail.",
				keys: ["Enter"],
				handler: () => {
					if (e.target !== e.currentTarget) return false;
					if (selected < 0) return false;
					jumpTo(selected);
				},
			},
			{
				id: "overview.hidden-slides.toggle",
				name: "Toggle hidden slides",
				description: "Show or hide slides marked hidden in the overview grid.",
				keys: ["h"],
				handler: () => setShowHiddenSlides((value) => !value),
			},
			{
				id: "overview.close",
				name: "Close overview",
				description: "Exit overview mode.",
				keys: ["o", "Escape"],
				handler: onClose,
			},
		];

		const handled = handleHotkeyEvent(e, hotkeys);
		if (handled) {
			// Stop the event from reaching window-level listeners (e.g. useKeyboardNav)
			// so overview shortcuts like Escape and arrow keys are not handled twice.
			e.stopPropagation();
		}
	}

	return (
		<div
			className={`flex flex-col h-full w-full min-h-0 overflow-y-auto bg-background text-foreground outline-none overscroll-contain ${className}`}
			tabIndex={-1}
			ref={containerRef}
			onKeyDown={handleKeyDown}
			role="dialog"
			aria-label="Slide overview"
			data-honeydeck-scrollable="true"
		>
			<div className="sticky top-0 z-20 flex justify-between items-center bg-background/75 px-4 py-3 backdrop-blur-xl border-b border-border/50">
				<span className="text-foreground/60 text-base font-sans">
					{listedCount} slide{listedCount !== 1 ? "s" : ""}
					{hiddenCount > 0 && ` — ${hiddenCount} hidden`}
					{!isMobile && " — click or press Enter to jump"}
				</span>
				<div className="flex items-center gap-2">
					{hiddenCount > 0 && (
						<button
							type="button"
							onClick={() => setShowHiddenSlides((value) => !value)}
							aria-pressed={showHiddenSlides}
							className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm text-surface-foreground"
						>
							{showHiddenSlides ? (
								<EyeOffIcon aria-hidden="true" size={14} />
							) : (
								<EyeIcon aria-hidden="true" size={14} />
							)}
							{showHiddenSlides ? "Hide hidden" : "Show hidden"} (h)
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="h-8 rounded-md border border-border bg-primary px-3 text-sm text-primary-foreground"
					>
						Close
					</button>
				</div>
			</div>

			<div
				style={{
					padding: isMobile ? MOBILE_PADDING : 24,
					paddingTop: isMobile ? MOBILE_PADDING : 24,
				}}
			>
				<div
					ref={gridRef}
					className="grid justify-center"
					style={{
						gap,
						gridTemplateColumns: isMobile
							? `repeat(${MOBILE_COLUMNS}, ${thumbW}px)`
							: `repeat(auto-fill, ${DESKTOP_THUMB_W}px)`,
					}}
				>
					{listedSlides.map(({ slide, index: i }) => {
						const isActive = i + 1 === currentSlide;
						const isSelected = i === selected;
						const showSelection = !isMobile && isSelected;

						return (
							<div
								key={
									isSelected && boundaryFeedback?.selected === i
										? `${slide.id}-${boundaryFeedback.key}`
										: slide.id
								}
								ref={isSelected ? selectedRef : null}
								style={{ scrollMarginBlock: SELECTION_SCROLL_MARGIN }}
								data-slide-index={i}
								data-boundary-feedback={
									isSelected && boundaryFeedback?.selected === i
										? boundaryFeedback.direction
										: undefined
								}
								data-slide-hidden={slide.hidden ? "true" : undefined}
								className={`honeydeck-overview-thumbnail block rounded-md overflow-hidden relative bg-background transition-all duration-100 ease-out hover:outline-2 ${
									slide.hidden ? "outline-dashed" : "outline-solid"
								} ${
									showSelection
										? "outline-4 outline-foreground shadow-lg scale-[1.01]"
										: "outline-1 outline-foreground/40"
								}`}
							>
								<SlideCanvas
									slideIndex={i}
									stepIndex={0}
									scale={thumbScale}
									showFutureSteps
									style={{
										width: canvasW,
										height: canvasH,
										pointerEvents: "none",
									}}
								/>

								<div className="absolute bottom-1.5 right-2 bg-surface text-surface-foreground text-xs px-1.5 py-0.5 rounded-xs">
									{i + 1}
								</div>

								{isActive && (
									<div className="absolute top-1.5 left-2 bg-accent text-accent-foreground text-2xs font-bold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow">
										Current
									</div>
								)}

								{slide.hidden && (
									<div className="absolute top-1.5 right-2 inline-flex items-center gap-1 bg-surface text-surface-foreground text-2xs font-bold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow">
										<EyeOffIcon aria-hidden="true" size={11} />
										Hidden
									</div>
								)}
								<button
									type="button"
									aria-current={isActive ? "true" : undefined}
									aria-label={
										slide.hidden
											? `Go to hidden slide ${i + 1}`
											: `Go to slide ${i + 1}`
									}
									className="absolute inset-0 z-10"
									onClick={() => jumpTo(i)}
									onFocus={() => setSelectedFrom("direct", i)}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function useOverviewMobile(): boolean {
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.matchMedia("(pointer: coarse)").matches;
	});

	useEffect(() => {
		const query = window.matchMedia("(pointer: coarse)");
		const update = () => setIsMobile(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return isMobile;
}

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

function getReducedMotionPreference(): boolean {
	return (
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
	);
}

function getScrollTopForNearestElement(
	container: HTMLElement,
	element: HTMLElement,
	margin: number,
): number {
	const containerRect = container.getBoundingClientRect();
	const elementRect = element.getBoundingClientRect();
	const currentTop = container.scrollTop;
	const viewportTop = currentTop;
	const viewportBottom = currentTop + container.clientHeight;
	const elementTop = currentTop + elementRect.top - containerRect.top;
	const elementBottom = currentTop + elementRect.bottom - containerRect.top;

	let targetTop = currentTop;

	if (elementTop - margin < viewportTop) {
		targetTop = elementTop - margin;
	} else if (elementBottom + margin > viewportBottom) {
		targetTop = elementBottom + margin - container.clientHeight;
	}

	const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
	return Math.min(Math.max(0, targetTop), maxTop);
}
