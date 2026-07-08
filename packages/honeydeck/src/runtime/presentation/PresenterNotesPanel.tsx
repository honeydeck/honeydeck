import type { ReactNode } from "react";

export type PresenterNotesPanelProps = {
	notes: ReactNode;
	className?: string;
};

const notesContentClassName = [
	"honeydeck-presenter-notes-content",
	"space-y-2",
	"[&_a]:text-white",
	"[&_a]:underline",
	"[&_blockquote]:border-l-2",
	"[&_blockquote]:border-white/20",
	"[&_blockquote]:pl-3",
	"[&_blockquote]:text-white/55",
	"[&_code]:rounded-xs",
	"[&_code]:bg-white/10",
	"[&_code]:px-1",
	"[&_code]:py-0.5",
	"[&_code]:font-mono",
	"[&_code]:text-sm",
	"[&_h1]:mb-2",
	"[&_h1]:mt-1",
	"[&_h1]:text-xl",
	"[&_h1]:font-semibold",
	"[&_h1]:leading-snug",
	"[&_h1]:text-white/90",
	"[&_h2]:mb-2",
	"[&_h2]:mt-3",
	"[&_h2]:text-lg",
	"[&_h2]:font-semibold",
	"[&_h2]:leading-snug",
	"[&_h2]:text-white/85",
	"[&_h3]:mb-1.5",
	"[&_h3]:mt-3",
	"[&_h3]:text-base",
	"[&_h3]:font-semibold",
	"[&_h3]:leading-snug",
	"[&_h3]:text-white/80",
	"[&_li]:my-1",
	"[&_ol]:list-decimal",
	"[&_ol]:pl-5",
	"[&_p]:my-2",
	"[&_pre]:overflow-x-auto",
	"[&_pre]:rounded",
	"[&_pre]:bg-white/10",
	"[&_pre]:p-2",
	"[&_pre_code]:bg-transparent",
	"[&_pre_code]:p-0",
	"[&_strong]:font-semibold",
	"[&_strong]:text-white/85",
	"[&_ul]:list-disc",
	"[&_ul]:pl-5",
].join(" ");

export function PresenterNotesPanel({
	notes,
	className = "",
}: PresenterNotesPanelProps) {
	return (
		<div
			className={`px-4 py-3 bg-white/4 rounded-md border border-white/8 min-h-0 overflow-y-auto overscroll-contain text-lg leading-relaxed text-white/75 ${className}`}
			data-honeydeck-scrollable="true"
		>
			<div className="text-xs font-semibold text-white/35 tracking-wider uppercase mb-2">
				Notes
			</div>
			{notes == null ? (
				<span className="text-white/25 italic">No notes for this slide.</span>
			) : (
				<div className={notesContentClassName}>{notes}</div>
			)}
		</div>
	);
}
