/**
 * App shell entry point.
 *
 * Bootstraps React and mounts the <Deck> component into the #root element
 * injected by index.html.
 *
 * This file is intentionally minimal — all presentation logic lives in Deck.
 * The path to this file is embedded at dev-time by the `honeydeck:app-shell` Vite
 * plugin using Vite's `/@fs/` file-system access mechanism, so it can live
 * outside the user's project root.
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
