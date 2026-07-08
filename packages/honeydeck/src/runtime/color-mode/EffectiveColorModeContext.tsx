import { createContext, type ReactNode, useContext } from "react";

export type EffectiveColorMode = "light" | "dark";

const EffectiveColorModeContext = createContext<EffectiveColorMode | null>(
	null,
);

type EffectiveColorModeProviderProps = {
	children: ReactNode;
	mode: EffectiveColorMode;
};

export function EffectiveColorModeProvider({
	children,
	mode,
}: EffectiveColorModeProviderProps) {
	return (
		<EffectiveColorModeContext.Provider value={mode}>
			{children}
		</EffectiveColorModeContext.Provider>
	);
}

export function readDocumentEffectiveColorMode(): EffectiveColorMode {
	if (typeof document === "undefined") return "light";
	return document.documentElement.getAttribute("data-honeydeck-color-mode") ===
		"dark"
		? "dark"
		: "light";
}

export function useEffectiveColorMode(): EffectiveColorMode {
	return (
		useContext(EffectiveColorModeContext) ?? readDocumentEffectiveColorMode()
	);
}
