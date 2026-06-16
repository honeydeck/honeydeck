import type { ReactNode } from "react";
import { CodeBlockCopyButton } from "./CodeBlockCopyButton.tsx";

type CodeBlockProps = {
	/** Original source copied by the hover/focus copy control. */
	source?: string;
	/** Extra classes for a specific code block implementation. */
	className?: string;
	children: ReactNode;
};

/** Shared frame for Honeydeck code block implementations. */
export function CodeBlock({ source, className, children }: CodeBlockProps) {
	return (
		<div
			className={[
				"honeydeck-code-block group relative mb-[0.75em] overflow-hidden rounded-honeydeck font-mono text-[length:var(--honeydeck-font-size-code)]",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<CodeBlockCopyButton source={source} />
			{children}
		</div>
	);
}
