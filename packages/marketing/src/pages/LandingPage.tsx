import { Button } from "@honeydeck/honeydeck/components";
import {
	BookOpenIcon,
	CheckIcon,
	ClipboardIcon,
	ExternalLinkIcon,
	SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { demoDecks, installCommand } from "../marketingContent.js";
import { HeroVisual } from "../ui/HeroVisual.js";
import {
	buttonSecondaryClass,
	eyebrowClass,
	quietLinkClass,
} from "../ui/styles.js";

export function LandingPage() {
	return (
		<main className="flex flex-1">
			<section className="relative flex flex-1 overflow-hidden">
				<div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(24rem,0.8fr)] lg:gap-10">
					<div className="max-w-3xl">
						<p className={eyebrowClass}>
							<SparklesIcon size={16} aria-hidden="true" /> Deck Experience for
							MDX people
						</p>
						<h1 className="mt-5 text-balance text-4xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
							Build beautiful slide decks with MDX and React.
						</h1>
						<p className="mt-5 max-w-2xl text-pretty text-lg leading-7 text-[color:var(--honeydeck-color-muted-foreground)] sm:mt-6 sm:text-xl sm:leading-8">
							Honeydeck keeps decks as plain text code, so humans and AI agents
							can edit the same presentation with confidence.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<CopyCommand />
							<Link className={buttonSecondaryClass} to="/docs/getting-started">
								<BookOpenIcon size={18} aria-hidden="true" /> Read docs
							</Link>
						</div>
						<div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
							{demoDecks.map((demo) => (
								<a className={quietLinkClass} href={demo.href} key={demo.href}>
									{demo.title}
									<ExternalLinkIcon size={14} aria-hidden="true" />
								</a>
							))}
						</div>
					</div>
					<HeroVisual />
				</div>
			</section>
		</main>
	);
}

function CopyCommand() {
	const [copied, setCopied] = useState(false);
	async function copy() {
		await navigator.clipboard.writeText(installCommand);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}
	return (
		<Button variant="primary" onClick={copy}>
			{copied ? (
				<CheckIcon size={18} aria-hidden="true" />
			) : (
				<ClipboardIcon size={18} aria-hidden="true" />
			)}
			<code>{installCommand}</code>
		</Button>
	);
}
