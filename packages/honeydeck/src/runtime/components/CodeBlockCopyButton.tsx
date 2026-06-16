import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

async function writeClipboardText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// Fall back to the textarea path below.
	}

	try {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.setAttribute("readonly", "");
		textarea.style.position = "fixed";
		textarea.style.inset = "0";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		const didCopy = document.execCommand("copy");
		document.body.removeChild(textarea);
		return didCopy;
	} catch {
		return false;
	}
}

type CodeBlockCopyButtonProps = {
	source?: string;
};

export function CodeBlockCopyButton({ source }: CodeBlockCopyButtonProps) {
	const [copied, setCopied] = useState(false);

	async function copySource() {
		if (!source) return;

		if (await writeClipboardText(source)) {
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		}
	}

	if (!source) return null;

	return (
		<button
			className="honeydeck-code-copy-button"
			type="button"
			aria-label={copied ? "Code copied" : "Copy code"}
			title={copied ? "Copied" : "Copy code"}
			onClick={copySource}
		>
			{copied ? (
				<CheckIcon aria-hidden="true" />
			) : (
				<CopyIcon aria-hidden="true" />
			)}
		</button>
	);
}
