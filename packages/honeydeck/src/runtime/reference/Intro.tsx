import type { ReactNode } from "react";

export function Intro({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="mb-8 pb-6">
			<h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
				{title}
			</h1>
			<p className="mt-3 max-w-3xl text-md leading-6 text-foreground/70">
				{children}
			</p>
		</div>
	);
}
