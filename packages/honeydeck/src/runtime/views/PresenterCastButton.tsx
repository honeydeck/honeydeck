import { CastIcon, StopCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

const UNSUPPORTED_HINT =
	"Presentation casting is not supported in this browser";
const UNSUPPORTED_NOTICE =
	"Casting unavailable: this browser does not support the Presentation API.";

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
	const [notice, setNotice] = useState<string | null>(null);
	const label = isCasting ? "Stop casting" : "Cast audience view";
	const status = !supported ? (notice ?? UNSUPPORTED_HINT) : notice;

	useEffect(() => {
		if (!notice) return;
		const timer = window.setTimeout(() => setNotice(null), 3000);
		return () => window.clearTimeout(timer);
	}, [notice]);

	function handleClick() {
		if (!supported) {
			setNotice(UNSUPPORTED_NOTICE);
			return;
		}

		if (isCasting) onStopCasting();
		else void onStartCasting();
	}

	return (
		<span className="inline-flex flex-col gap-1">
			<button
				type="button"
				onClick={handleClick}
				title={supported ? label : UNSUPPORTED_HINT}
				aria-label={supported ? label : UNSUPPORTED_HINT}
				aria-disabled={!supported}
				className={`px-3 py-1 rounded border border-white/20 text-white/80 text-sm font-[inherit] inline-flex items-center gap-1.5 ${
					supported
						? "bg-white/6"
						: "bg-white/4 text-white/45 border-white/10 cursor-not-allowed"
				}`}
			>
				{label}
				{isCasting ? (
					<StopCircleIcon aria-hidden="true" size={14} />
				) : (
					<CastIcon aria-hidden="true" size={14} />
				)}
			</button>
			{status && (
				<span
					aria-live="polite"
					className="max-w-48 text-xs leading-tight text-white/45"
				>
					{status}
				</span>
			)}
		</span>
	);
}
