import { ArrowRightIcon, CheckIcon, UsersIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { HeroVisual } from "../ui/HeroVisual.js";
import { buttonPrimaryClass, eyebrowClass } from "../ui/styles.js";

const content = {
	icon: <UsersIcon size={28} aria-hidden="true" />,
	title: "Honeydeck for product stories",
	subtitle:
		"Pair AI-assisted drafting with developer-grade presentation source to produce crisp roadmap, strategy, and launch decks.",
	bullets: [
		"Ask an agent to draft structure, notes, and demo narrative.",
		"Collaborate with developers when live product components help.",
		"Export presenter-ready PDFs when sharing offline.",
	],
	cta: "Open getting started",
};

export function AudiencePage() {
	return (
		<main className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[1fr_0.8fr] lg:gap-10 lg:py-16">
			<section>
				<p className={eyebrowClass}>{content.icon} Audience guide</p>
				<h1 className="mt-5 text-balance text-4xl font-black leading-[1.04] sm:text-6xl lg:text-7xl">
					{content.title}
				</h1>
				<p className="mt-5 text-lg leading-7 text-[color:var(--honeydeck-color-muted-foreground)] sm:mt-6 sm:text-xl sm:leading-8">
					{content.subtitle}
				</p>
				<ul className="mt-8 grid gap-3">
					{content.bullets.map((bullet) => (
						<li className="flex gap-3" key={bullet}>
							<CheckIcon
								className="mt-1 shrink-0 text-[color:var(--honeydeck-color-primary)]"
								size={18}
								aria-hidden="true"
							/>
							<span>{bullet}</span>
						</li>
					))}
				</ul>
				<Link
					className={`${buttonPrimaryClass} mt-8`}
					to="/docs/getting-started"
				>
					{content.cta}
					<ArrowRightIcon size={18} aria-hidden="true" />
				</Link>
			</section>
			<HeroVisual />
		</main>
	);
}
