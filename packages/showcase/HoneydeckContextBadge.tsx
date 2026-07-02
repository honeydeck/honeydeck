import { useHoneydeck } from "@honeydeck/honeydeck";

export function HoneydeckContextBadge() {
	const honeydeck = useHoneydeck();

	return (
		<div className="rounded-honeydeck border border-border bg-surface p-6 text-surface-foreground shadow-lg">
			<div className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
				useHoneydeck()
			</div>
			<div className="grid grid-cols-2 gap-3 text-xl">
				<div>
					<div className="text-sm text-surface-foreground/60">Slide</div>
					<div className="font-semibold">{honeydeck.currentSlide.index}</div>
				</div>
				<div>
					<div className="text-sm text-surface-foreground/60">Step</div>
					<div className="font-semibold">
						{honeydeck.currentSlide.step}/{honeydeck.currentSlide.maxSteps}
					</div>
				</div>
				<div>
					<div className="text-sm text-surface-foreground/60">Layout</div>
					<div className="font-semibold">{honeydeck.currentSlide.layout}</div>
				</div>
				<div>
					<div className="text-sm text-surface-foreground/60">Mode</div>
					<div className="font-semibold">{honeydeck.mode}</div>
				</div>
			</div>
			<div className="mt-4 text-sm text-surface-foreground/70">
				Deck title: {honeydeck.config.title}
			</div>
		</div>
	);
}
