import { CastIcon, StopCircleIcon } from "lucide-react";

const UNSUPPORTED_HINT =
	"Presentation casting is not supported in this browser";

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
	const title = supported ? label : UNSUPPORTED_HINT;

	function handleClick() {
		if (!supported) return;
		if (isCasting) onStopCasting();
		else void onStartCasting();
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			title={title}
			aria-label={title}
			aria-disabled={!supported}
			className={`px-3 py-1 rounded border text-sm font-[inherit] inline-flex items-center gap-1.5 transition-[background,color,border-color,opacity] ${
				supported
					? "border-white/20 bg-white/6 text-white/80 hover:bg-white/10"
					: "border-white/10 bg-white/3 text-white/25 opacity-60 grayscale cursor-not-allowed"
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
