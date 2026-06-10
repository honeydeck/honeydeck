import type { TokenManifestEntry } from "virtual:honeydeck/token-manifest";
import * as tokenManifest from "virtual:honeydeck/token-manifest";
import { useEffect, useState } from "react";
import { Intro } from "./Intro.tsx";

const { tokens } = tokenManifest;

function colorLike(token: TokenManifestEntry): boolean {
	const value = token.defaultValue.toLowerCase();
	return (
		value.startsWith("#") ||
		value.startsWith("rgb(") ||
		value.startsWith("hsl(") ||
		value.startsWith("oklch(")
	);
}

function TokenValue({ value }: { value: string }) {
	return (
		<code
			className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-xs bg-surface px-2 py-1 font-mono text-xs text-surface-foreground"
			title={value}
		>
			{value}
		</code>
	);
}

function ComputedTokenValue({ name }: { name: string }) {
	const [value, setValue] = useState("");

	useEffect(() => {
		function read() {
			setValue(
				getComputedStyle(document.documentElement)
					.getPropertyValue(name)
					.trim(),
			);
		}

		read();
		const observer = new MutationObserver(read);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-honeydeck-color-mode"],
		});
		return () => observer.disconnect();
	}, [name]);

	return <TokenValue value={value || "—"} />;
}

export function ThemeTab() {
	return (
		<>
			<Intro title="Theme tokens">
				All{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
					--honeydeck-*
				</code>{" "}
				tokens. Descriptions come from CSS comments; computed values come from{" "}
				<code className="rounded-xs bg-surface px-1 py-0.5 font-mono">
					getComputedStyle
				</code>
				.
			</Intro>

			<div className="overflow-x-auto rounded-md border border-border">
				<table className="w-full min-w-240 table-fixed border-collapse text-left text-md">
					<thead className="border-b border-border bg-surface text-xs uppercase tracking-wider text-surface-foreground/60">
						<tr>
							<th className="w-[28%] px-4 py-3 font-medium">Token</th>
							<th className="w-[32%] px-4 py-3 font-medium">Description</th>
							<th className="w-[20%] px-4 py-3 font-medium">Default</th>
							<th className="w-[20%] px-4 py-3 font-medium">Computed</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{tokens.map((token) => (
							<tr key={token.name}>
								<td className="px-4 py-3 align-top">
									<div className="flex items-center gap-2">
										{colorLike(token) && (
											<span
												className="size-5 shrink-0 rounded-xs border border-border"
												style={{ backgroundColor: `var(${token.name})` }}
											/>
										)}
										<code className="font-mono text-sm font-medium text-foreground">
											{token.name}
										</code>
									</div>
								</td>
								<td className="px-4 py-3 align-top leading-6 text-foreground/70">
									{token.description || "—"}
								</td>
								<td className="px-4 py-3 align-top">
									<TokenValue value={token.defaultValue} />
								</td>
								<td className="px-4 py-3 align-top">
									<ComputedTokenValue name={token.name} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
