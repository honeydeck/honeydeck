/* biome-ignore-all lint/security/noDangerouslySetInnerHtml: KaTeX renders with trust disabled. */
import katex from "katex";
import { isValidElement, type ReactNode } from "react";

type LatexProps = {
	/** LaTeX source. Prefer String.raw`...` for expressions with backslashes. */
	source?: string;
	children?: ReactNode;
	className?: string;
};

function childrenToSource(children: ReactNode): string {
	if (typeof children === "string" || typeof children === "number") {
		return String(children);
	}

	if (Array.isArray(children)) {
		return children.map(childrenToSource).join("");
	}

	if (isValidElement<{ children?: ReactNode }>(children)) {
		return childrenToSource(children.props.children);
	}

	return "";
}

function renderLatex(source: string, displayMode: boolean): string {
	return katex.renderToString(source.trim(), {
		displayMode,
		throwOnError: false,
		strict: false,
		trust: false,
	});
}

function classNames(...values: Array<string | undefined>): string {
	return values.filter(Boolean).join(" ");
}

export function InlineLatex({ source, children, className }: LatexProps) {
	const latex = source ?? childrenToSource(children);

	return (
		<span
			className={classNames("latex-inline", className)}
			dangerouslySetInnerHTML={{ __html: renderLatex(latex, false) }}
		/>
	);
}

export function BlockLatex({ source, children, className }: LatexProps) {
	const latex = source ?? childrenToSource(children);

	return (
		<figure className={classNames("latex-display", className)}>
			<div dangerouslySetInnerHTML={{ __html: renderLatex(latex, true) }} />
		</figure>
	);
}
