import { CastIcon, StopCircleIcon } from "lucide-react";

export function PresenterCastButton({
	supported,
	isCasting,
	onStartCasting,
	onStopCasting,
}: {
	supported: boolean;
	isCasting: boolean;
	onStartCasting: () => void | Promise<void>;
	onStopCasting: () => void;
}) {
	const label = isCasting ? "Stop casting" : "Cast audience view";
	const unsupportedHint = "Presentation casting is not supported in this browser";

	return (
		<button
			type="button"
			onClick={isCasting ? onStopCasting : onStartCasting}
			disabled={!supported}
			title={supported ? label : unsupportedHint}
			aria-label={supported ? label : unsupportedHint}
			className={`px-3 py-1 rounded border border-white/20 text-white/80 text-sm font-[inherit] inline-flex items-center gap-1.5 ${
				supported
					? "bg-white/6"
					: "bg-white/4 text-white/30 border-white/10 cursor-not-allowed"
			}`}
		>
			{label}
			{isCasting ? (
				<StopCircleIcon aria-hidden="true" size={14} />
			) : (
				<CastIcon aria-hidden="true" size={14} />
			)}
		</button>
	);
}
