import { DefaultLayout } from "@honeydeck/honeydeck/layouts";
import type { LayoutMap } from "@honeydeck/honeydeck/types";
import WelcomeCover from "./layouts/WelcomeCover.tsx";
import Brutalist from "./layouts/Brutalist.tsx";
import DiagonalSplit from "./layouts/DiagonalSplit.tsx";
import HexGrid from "./layouts/HexGrid.tsx";

export default {
	WelcomeCover,
	Brutalist,
	DiagonalSplit,
	HexGrid,
	Default: DefaultLayout,
} satisfies LayoutMap;
