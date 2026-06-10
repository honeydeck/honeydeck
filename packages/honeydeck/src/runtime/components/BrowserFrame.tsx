import {
	type CSSProperties,
	type IframeHTMLAttributes,
	type ReactNode,
	useState,
} from "react";

type IframeProps = Omit<
	IframeHTMLAttributes<HTMLIFrameElement>,
	"className" | "height" | "src" | "style"
>;

export type BrowserFrameProps = IframeProps & {
	/**
	 * URL loaded by the iframe.
	 *
	 * This should be a URL the browser can load from the presented deck, such as
	 * an external `https://` URL or a local Vite-served route like `/demo.html`.
	 */
	src: string;
	/**
	 * Optional content shown in the address-bar field.
	 *
	 * Pass a short string such as `example.com` for the common case, or pass any
	 * React node when a richer label is needed. Omit this prop to hide the
	 * address-bar field while keeping the browser chrome.
	 */
	addressBar?: ReactNode;
	/**
	 * Light/default screenshot shown when iframe loading fails or fallback mode is toggled on.
	 *
	 * Use this to keep a talk reliable when a live site is offline, blocked by
	 * iframe headers, or not available during PDF export.
	 */
	fallbackImage?: string;
	/**
	 * Dark-mode screenshot shown when fallback mode is active.
	 *
	 * When omitted, `fallbackImage` is used for every color mode.
	 */
	fallbackDarkImage?: string;
	/**
	 * Accessible alt text for the fallback image.
	 *
	 * Defaults to `Fallback preview`.
	 */
	fallbackAlt?: string;
	/**
	 * Start in fallback mode instead of loading the iframe.
	 *
	 * Useful for deterministic demos, final-state screenshots, and PDF-friendly
	 * decks where the static preview is preferred by default.
	 */
	defaultFallback?: boolean;
	/**
	 * Aspect ratio of the full browser window, including chrome. Defaults to `16 / 9`.
	 *
	 * Accepts the same values as React's `style.aspectRatio`, for example `16 / 9`,
	 * `"4 / 3"`, or `1.6`.
	 */
	aspectRatio?: CSSProperties["aspectRatio"];
	/** Additional CSS class for the outer browser frame. */
	className?: string;
	/**
	 * Additional CSS class for the iframe element.
	 *
	 * Only applied while live iframe content is rendered. It is not applied to the
	 * fallback image container.
	 */
	iframeClassName?: string;
};

function cn(...classes: (string | undefined | false)[]): string | undefined {
	const value = classes.filter(Boolean).join(" ");
	return value || undefined;
}

function frameStyle(
	aspectRatio: CSSProperties["aspectRatio"] | undefined,
): CSSProperties {
	return {
		"--honeydeck-browser-frame-aspect-ratio": aspectRatio ?? "16 / 9",
	} as CSSProperties;
}

/**
 * Displays an iframe inside a macOS-style browser window frame.
 *
 * The frame uses CSS to size itself to the largest rectangle that fits its parent
 * while preserving `aspectRatio`. It renders macOS-style traffic-light controls,
 * optional address-bar content, and a live iframe. When `fallbackImage` is
 * provided, iframe load errors switch to a static screenshot; presenters can
 * also toggle that fallback with the extra chrome control that appears on hover
 * or keyboard focus.
 *
 * Standard iframe attributes such as `allow`, `sandbox`, `loading`, and
 * `referrerPolicy` are forwarded to the live iframe.
 *
 * ```mdx
 * import { BrowserFrame } from '@honeydeck/honeydeck'
 *
 * <BrowserFrame
 *   src="https://example.com"
 *   addressBar="example.com"
 *   fallbackImage="/example-light.png"
 *   fallbackDarkImage="/example-dark.png"
 * />
 * ```
 */
export function BrowserFrame({
	src,
	addressBar,
	fallbackImage,
	fallbackDarkImage,
	fallbackAlt,
	defaultFallback = false,
	aspectRatio,
	className,
	iframeClassName,
	onError,
	...iframeProps
}: BrowserFrameProps) {
	const hasFallback = Boolean(fallbackImage);
	const [showFallback, setShowFallback] = useState(
		defaultFallback && hasFallback,
	);
	const fallbackActive = hasFallback && showFallback;
	const fallbackLabel = "Fallback preview";
	const iframeTitle =
		iframeProps.title ??
		(typeof addressBar === "string" ? addressBar : "Embedded page");
	const alt = fallbackAlt ?? fallbackLabel;

	return (
		<div className="grid h-full min-h-0 w-full place-items-center [container-type:size]">
			<div
				className={cn(
					"group mx-auto flex aspect-[var(--honeydeck-browser-frame-aspect-ratio)] w-[min(100cqw,calc(100cqh*var(--honeydeck-browser-frame-aspect-ratio)))] max-w-full flex-col self-center overflow-hidden rounded-[calc(var(--honeydeck-border-radius)*2)] border border-border bg-surface font-body text-surface-foreground shadow-[0_2px_6px_color-mix(in_srgb,var(--honeydeck-foreground)_10%,transparent)]",
					className,
				)}
				data-honeydeck-browser-frame=""
				data-fallback={fallbackActive ? "true" : undefined}
				style={frameStyle(aspectRatio)}
			>
				<div
					className="flex items-center gap-[0.55em] border-border border-b bg-[color-mix(in_srgb,var(--honeydeck-surface)_88%,var(--honeydeck-background))] px-[0.55em] py-[0.42em]"
					data-honeydeck-browser-frame-chrome=""
				>
					<div className="flex items-center gap-[0.22em]">
						<span
							className="h-[0.36em] w-[0.36em] rounded-full border border-[color-mix(in_srgb,var(--honeydeck-foreground)_18%,transparent)] bg-[#ff5f57]"
							aria-hidden="true"
						/>
						<span
							className="h-[0.36em] w-[0.36em] rounded-full border border-[color-mix(in_srgb,var(--honeydeck-foreground)_18%,transparent)] bg-[#febc2e]"
							aria-hidden="true"
						/>
						<span
							className="h-[0.36em] w-[0.36em] rounded-full border border-[color-mix(in_srgb,var(--honeydeck-foreground)_18%,transparent)] bg-[#28c840]"
							aria-hidden="true"
						/>
						{hasFallback && (
							<button
								type="button"
								className="h-[0.36em] w-[0.36em] cursor-pointer appearance-none rounded-full border border-[color-mix(in_srgb,var(--honeydeck-foreground)_18%,transparent)] bg-accent p-0 opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
								data-honeydeck-browser-frame-toggle=""
								aria-label={
									fallbackActive
										? "Show live browser content"
										: "Show fallback preview"
								}
								aria-pressed={fallbackActive}
								onClick={() => setShowFallback((value) => !value)}
							/>
						)}
					</div>
					{addressBar !== undefined && (
						<div
							className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-honeydeck border border-border bg-background px-[0.7em] py-[0.28em] text-center font-mono text-[0.42em] text-foreground leading-[1.4]"
							data-honeydeck-browser-frame-address=""
						>
							{addressBar}
						</div>
					)}
					{fallbackActive && (
						<span
							className="ml-auto inline-flex shrink-0 items-center rounded-honeydeck border border-border bg-background px-[0.7em] py-[0.28em] font-mono font-semibold text-[0.42em] text-foreground leading-[1.4]"
							data-honeydeck-browser-frame-badge=""
						>
							{fallbackLabel}
						</span>
					)}
				</div>
				<div className="relative min-h-0 flex-1 overflow-hidden bg-background">
					{fallbackActive ? (
						<div className="block h-full w-full border-0 bg-background">
							<img
								className={cn(
									"block h-full w-full object-cover",
									fallbackDarkImage &&
										"[[data-honeydeck-color-mode=dark]_&]:hidden",
								)}
								src={fallbackImage}
								alt={alt}
							/>
							{fallbackDarkImage && (
								<img
									className="hidden h-full w-full object-cover [[data-honeydeck-color-mode=dark]_&]:block"
									src={fallbackDarkImage}
									alt={alt}
								/>
							)}
						</div>
					) : (
						<iframe
							{...iframeProps}
							className={cn(
								"block h-full w-full border-0 bg-background",
								iframeClassName,
							)}
							src={src}
							title={iframeTitle}
							onError={(event) => {
								if (hasFallback) setShowFallback(true);
								onError?.(event);
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
