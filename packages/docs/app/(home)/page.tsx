import {
	BookOpenIcon,
	ExternalLinkIcon,
	SparklesIcon,
	StarIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CopyInstallCommand } from "@/components/CopyInstallCommand";

const transitionClass =
	"transition-[background-color,border-color,color,box-shadow] duration-150";
const hoverBorderClass =
	"hover:border-[color:color-mix(in_oklab,var(--honeydeck-color-primary)_48%,var(--honeydeck-color-border))]";
const surfaceControlClass = `border border-[color:var(--honeydeck-color-border)] bg-[color-mix(in_oklab,var(--honeydeck-color-surface)_86%,transparent)] text-[color:var(--honeydeck-color-foreground)] ${hoverBorderClass}`;
const buttonBaseClass = `inline-flex items-center justify-center gap-2.5 rounded-lg px-4 py-3 font-black no-underline ${transitionClass}`;
const buttonPrimaryClass = `${buttonBaseClass} border border-[color:color-mix(in_oklab,#000_10%,var(--honeydeck-color-primary))] bg-[color:var(--honeydeck-color-primary)] text-[color:var(--honeydeck-color-primary-foreground)] shadow-[0_14px_30px_color-mix(in_oklab,var(--honeydeck-color-primary)_26%,transparent)] ${hoverBorderClass}`;
const buttonSecondaryClass = `${buttonBaseClass} ${surfaceControlClass}`;
const quietLinkClass = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-[color:var(--honeydeck-color-border)] px-4 py-3 font-black text-[color:color-mix(in_oklab,var(--honeydeck-color-foreground)_70%,var(--honeydeck-color-background))] no-underline hover:text-[color:var(--honeydeck-color-foreground)] ${hoverBorderClass} ${transitionClass}`;

export default function HomePage() {
	return (
		<main className="flex flex-1">
			<section className="relative flex flex-1 overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
				<div
					aria-hidden="true"
					className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-[color-mix(in_oklab,var(--honeydeck-color-primary)_22%,transparent)] blur-3xl"
				/>
				<div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.7fr)]">
					<div className="max-w-3xl">
						<p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--honeydeck-color-border)] bg-[color:var(--docs-panel)] px-3 py-1 text-sm font-black text-[color:var(--honeydeck-color-muted-foreground)]">
							<SparklesIcon size={16} aria-hidden="true" /> Deck experience for
							MDX people
						</p>
						<h1 className="mt-6 text-balance text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
							Build beautiful slide decks with MDX and React.
						</h1>
						<p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-[color:var(--honeydeck-color-muted-foreground)] sm:text-xl">
							Honeydeck keeps presentations as plain text code, so teams and AI
							agents can draft, review, present, and export decks with
							confidence.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
							<Link className={buttonPrimaryClass} href="/docs/getting-started">
								<BookOpenIcon size={18} aria-hidden="true" /> Start reading docs
							</Link>
							<CopyInstallCommand />
							<a
								className={buttonSecondaryClass}
								href="https://showcase.honeydeck.dev/"
							>
								View showcase <ExternalLinkIcon size={16} aria-hidden="true" />
							</a>
							<a
								className={quietLinkClass}
								href="https://github.com/honeydeck/honeydeck"
							>
								<StarIcon size={16} aria-hidden="true" /> Star on GitHub
							</a>
						</div>
					</div>
					<figure className="relative mx-auto w-full max-w-lg overflow-visible">
						<div
							aria-hidden="true"
							className="absolute inset-10 rounded-full bg-[color-mix(in_oklab,var(--honeydeck-color-primary)_16%,transparent)] blur-3xl"
						/>
						<Image
							alt="Dex, the Honeydeck bee mascot, presenting a slide deck workflow."
							className="relative mx-auto aspect-[4/3] w-full object-contain drop-shadow-[0_28px_55px_var(--docs-shadow)]"
							height={768}
							priority
							src="/images/dex-home-hero-transparent.webp"
							width={1024}
						/>
					</figure>
				</div>
			</section>
		</main>
	);
}
