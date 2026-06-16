import { createContext, type ReactNode, useContext } from "react";

const SlideScaleContext = createContext(1);

type SlideScaleProviderProps = {
	children: ReactNode;
	scale: number;
};

export function SlideScaleProvider({
	children,
	scale,
}: SlideScaleProviderProps) {
	return (
		<SlideScaleContext.Provider value={scale}>
			{children}
		</SlideScaleContext.Provider>
	);
}

export function useSlideScale(): number {
	return useContext(SlideScaleContext);
}
