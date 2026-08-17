export type PresenterNextPreview = {
	slideIndex: number;
	stepIndex: number;
} | null;

export function getPresenterNextPreview({
	currentIndex,
	step,
	stepCount,
	totalSlides,
	isSlideHidden,
}: {
	currentIndex: number;
	step: number;
	stepCount: number;
	totalSlides: number;
	/** Returns whether a 0-based slide index is hidden from the timeline. */
	isSlideHidden?: (slideIndex: number) => boolean;
}): PresenterNextPreview {
	if (step < stepCount) {
		return { slideIndex: currentIndex, stepIndex: step + 1 };
	}

	// The preview follows timeline navigation, which skips hidden slides.
	for (
		let slideIndex = currentIndex + 1;
		slideIndex < totalSlides;
		slideIndex++
	) {
		if (isSlideHidden?.(slideIndex) === true) continue;
		return { slideIndex, stepIndex: 0 };
	}

	return null;
}
