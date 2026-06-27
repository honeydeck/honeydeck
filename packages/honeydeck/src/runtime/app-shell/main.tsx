/**
 * App shell entry point.
 *
 * Bootstraps React and mounts the <Deck> component into the #root element
 * injected by index.html.
 *
 * This file is intentionally minimal — all presentation logic lives in Deck.
 * This file is loaded through the package subpath
 * `@honeydeck/honeydeck/app-shell` so it shares the same Honeydeck package
 * module graph as deck-authored imports from `@honeydeck/honeydeck`.
 */

import { config } from "virtual:honeydeck/config";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
	applyHoneydeckColorMode,
	readSystemPrefersDark,
	resolveEffectiveColorMode,
} from "../colorMode.ts";
import { Deck } from "../Deck.tsx";

applyHoneydeckColorMode(
	resolveEffectiveColorMode(
		config.colorMode as string | null | undefined,
		readSystemPrefersDark(),
	),
);

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error(
		"[honeydeck] #root element not found — the index.html template may be corrupted.",
	);
}

createRoot(rootElement).render(
	<StrictMode>
		<Deck />
	</StrictMode>,
);
