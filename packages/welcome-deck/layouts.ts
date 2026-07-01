import { DefaultLayout } from "@honeydeck/honeydeck/layouts";
import type { LayoutMap } from "@honeydeck/honeydeck/types";
import Brutalist from "./layouts/Brutalist.tsx";
import DiagonalSplit from "./layouts/DiagonalSplit.tsx";
import HexGrid from "./layouts/HexGrid.tsx";
import WelcomeCover from "./layouts/WelcomeCover.tsx";

export default {
	WelcomeCover,
	Brutalist,
	DiagonalSplit,
	HexGrid,
	Default: DefaultLayout,
} satisfies LayoutMap;
