const BASE_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;

export type DeckDimensions = {
	width: number;
	height: number;
};

export function parseAspectRatio(ratio: unknown): DeckDimensions {
	if (typeof ratio !== "string") {
		return { width: BASE_WIDTH, height: DEFAULT_HEIGHT };
	}

	const match = ratio.match(/^(\d+):(\d+)$/);
	if (!match) {
		return { width: BASE_WIDTH, height: DEFAULT_HEIGHT };
	}

	const [, widthValue, heightValue] = match;
	if (!widthValue || !heightValue) {
		return { width: BASE_WIDTH, height: DEFAULT_HEIGHT };
	}

	const width = parseInt(widthValue, 10);
	const height = parseInt(heightValue, 10);
	if (!width || !height) {
		return { width: BASE_WIDTH, height: DEFAULT_HEIGHT };
	}

	return {
		width: BASE_WIDTH,
		height: Math.round((BASE_WIDTH * height) / width),
	};
}
