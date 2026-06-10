export function SlideNumberBadge({ slide }: { slide: number }) {
	return (
		<div
			role="status"
			aria-label={`Slide ${slide}`}
			className="absolute right-4 bottom-4 z-50 pointer-events-none text-3xl md:text-4xl tabular-nums text-foreground/75"
		>
			{slide}
		</div>
	);
}
