/**
 * ErrorBoundary — per-slide React error boundary.
 *
 * Wraps each slide in Deck.tsx so a runtime error in one slide doesn't crash
 * the entire presentation. Other slides remain fully navigable.
 *
 * ### Dev mode
 * Shows the error message and stack trace rendered inside the slide canvas
 * area so it's visible without opening DevTools.
 *
 * ### Production mode
 * Shows a minimal "Something went wrong" message with the slide number.
 *
 * ### Usage
 * ```tsx
 * <ErrorBoundary slideNumber={i + 1}>
 *   <SlideContents />
 * </ErrorBoundary>
 * ```
 */

import { AlertTriangleIcon, BombIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
	/** 1-based slide number — shown in the fallback UI. */
	slideNumber: number;
	children: ReactNode;
};

type State = {
	hasError: boolean;
	error: Error | null;
	componentStack: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null, componentStack: "" };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error, componentStack: "" };
	}

	override componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error(
			`[honeydeck] ❌ Error on slide ${this.props.slideNumber}:`,
			error,
			info.componentStack,
		);
		this.setState({ componentStack: info.componentStack ?? "" });
	}

	override render(): ReactNode {
		if (!this.state.hasError) {
			return this.props.children;
		}

		const { slideNumber } = this.props;
		const { error, componentStack } = this.state;

		// Check if we're in dev mode via Vite's injected env
		const isDev =
			typeof import.meta !== "undefined" &&
			(import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

		if (isDev) {
			return (
				<div className="w-full h-full flex flex-col bg-error-surface text-error font-mono p-8 overflow-auto box-border">
					{/* Header */}
					<div className="flex items-center gap-3 mb-5 shrink-0">
						<BombIcon aria-hidden="true" className="shrink-0" size={48} />
						<div>
							<div className="text-4xl font-bold text-error">
								Error on slide {slideNumber}
							</div>
							<div className="text-md text-error/60 mt-1">
								Other slides are still navigable (← →)
							</div>
						</div>
					</div>

					{/* Error message */}
					<div className="bg-error/8 border border-error/30 rounded-md p-4 mb-4 shrink-0">
						<div className="text-2xl font-semibold mb-2">
							{error?.name ?? "Error"}: {error?.message}
						</div>
					</div>

					{/* Stack trace */}
					{(error?.stack || componentStack) && (
						<pre className="bg-black/40 border border-white/8 rounded-md p-4 text-base leading-relaxed overflow-auto text-red-200/80 m-0 shrink-0">
							{error?.stack ?? ""}
							{componentStack && (
								<>
									{"\n\nComponent stack:"}
									{componentStack}
								</>
							)}
						</pre>
					)}
				</div>
			);
		}

		// Production fallback
		return (
			<div className="w-full h-full flex flex-col items-center justify-center bg-void text-white/60 font-sans gap-3">
				<AlertTriangleIcon aria-hidden="true" size={64} />
				<div className="text-3xl font-semibold">Something went wrong</div>
				<div className="text-md">Slide {slideNumber}</div>
			</div>
		);
	}
}
