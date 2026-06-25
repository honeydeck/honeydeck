"use client";

import { CheckIcon, ClipboardIcon, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { installCommand } from "@/lib/shared";

export function CopyInstallCommand() {
	const [copied, setCopied] = useState(false);

	async function copyCommand() {
		await navigator.clipboard.writeText(installCommand);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}

	return (
		<button
			aria-label="Copy Honeydeck init command"
			className="inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--honeydeck-color-border)] bg-[color:var(--docs-panel)] px-4 py-3 font-mono text-sm font-black shadow-sm transition-colors hover:border-[color:color-mix(in_oklab,var(--honeydeck-color-primary)_48%,var(--honeydeck-color-border))]"
			onClick={copyCommand}
			type="button"
		>
			<TerminalIcon size={16} aria-hidden="true" />
			<code className="truncate">{installCommand}</code>
			{copied ? (
				<CheckIcon className="shrink-0" size={16} aria-hidden="true" />
			) : (
				<ClipboardIcon className="shrink-0" size={16} aria-hidden="true" />
			)}
			<span className="sr-only">{copied ? "Copied" : "Copy"}</span>
		</button>
	);
}
