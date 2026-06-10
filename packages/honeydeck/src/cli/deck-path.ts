import { basename, dirname, extname, resolve } from "node:path";
import { DEFAULT_DECK_ENTRY } from "../defaults.ts";

export type DeckPathOptions = {
	deck: string;
	root: string;
	entry: string;
};

export function resolveDeckPath(
	deckPath = DEFAULT_DECK_ENTRY,
): DeckPathOptions {
	const deck = resolve(process.cwd(), deckPath);

	return {
		deck,
		root: dirname(deck),
		entry: basename(deck),
	};
}

export function validateDeckPath(deckPath: string, option: string): void {
	if (extname(deckPath) !== ".mdx") {
		console.error(`❌  ${option} must point to an .mdx file: ${deckPath}`);
		process.exit(1);
	}
}

export function rejectRootOption(): never {
	console.error("❌  --root is no longer supported. Use --deck <file.mdx>.");
	process.exit(1);
}
