export type PresenterNextPreview = {
	slideIndex: number;
	stepIndex: number;
} | null;

export function getPresenterNextPreview({
	currentIndex,
	step,
	stepCount,
	totalSlides,
}: {
	currentIndex: number;
	step: number;
	stepCount: number;
	totalSlides: number;
}): PresenterNextPreview {
	if (step < stepCount) {
		return { slideIndex: currentIndex, stepIndex: step + 1 };
	}

	const nextSlideIndex = currentIndex + 1;
	if (nextSlideIndex < totalSlides) {
		return { slideIndex: nextSlideIndex, stepIndex: 0 };
	}

	return null;
}
