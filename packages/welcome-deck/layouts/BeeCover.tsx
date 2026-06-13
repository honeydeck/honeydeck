import type { LayoutDemo, LayoutProps } from "@honeydeck/honeydeck/types";

const bees = [
	{
		top: "8%",
		left: "12%",
		size: "3rem",
		opacity: 0.15,
		rotate: 20,
		duration: 12,
		delay: 0,
	},
	{
		top: "15%",
		left: "75%",
		size: "2.5rem",
		opacity: 0.12,
		rotate: -15,
		duration: 15,
		delay: 1,
	},
	{
		top: "30%",
		left: "5%",
		size: "2rem",
		opacity: 0.1,
		rotate: 45,
		duration: 18,
		delay: 2,
	},
	{
		top: "25%",
		left: "88%",
		size: "3.5rem",
		opacity: 0.18,
		rotate: -30,
		duration: 10,
		delay: 0.5,
	},
	{
		top: "55%",
		left: "8%",
		size: "2.8rem",
		opacity: 0.13,
		rotate: 10,
		duration: 14,
		delay: 3,
	},
	{
		top: "60%",
		left: "82%",
		size: "2rem",
		opacity: 0.09,
		rotate: -45,
		duration: 20,
		delay: 1.5,
	},
	{
		top: "75%",
		left: "20%",
		size: "3.2rem",
		opacity: 0.14,
		rotate: 35,
		duration: 11,
		delay: 4,
	},
	{
		top: "80%",
		left: "70%",
		size: "2.5rem",
		opacity: 0.11,
		rotate: -20,
		duration: 16,
		delay: 2.5,
	},
	{
		top: "45%",
		left: "92%",
		size: "1.8rem",
		opacity: 0.08,
		rotate: 60,
		duration: 19,
		delay: 0.8,
	},
	{
		top: "10%",
		left: "45%",
		size: "2rem",
		opacity: 0.07,
		rotate: -10,
		duration: 13,
		delay: 3.5,
	},
	{
		top: "88%",
		left: "50%",
		size: "2.2rem",
		opacity: 0.1,
		rotate: 25,
		duration: 17,
		delay: 1.2,
	},
	{
		top: "40%",
		left: "18%",
		size: "1.5rem",
		opacity: 0.06,
		rotate: -55,
		duration: 22,
		delay: 5,
	},
];

export default function BeeCover({ title, children }: LayoutProps) {
	return (
		<div className="relative grid h-full place-items-center overflow-hidden bg-background p-16">
			<style>{`
				@keyframes bee-drift {
					0%, 100% { transform: translate(0, 0) rotate(var(--bee-rotate)); }
					25% { transform: translate(30px, -20px) rotate(calc(var(--bee-rotate) + 10deg)); }
					50% { transform: translate(-15px, 15px) rotate(calc(var(--bee-rotate) - 5deg)); }
					75% { transform: translate(20px, 25px) rotate(calc(var(--bee-rotate) + 8deg)); }
				}
			`}</style>

			{bees.map((bee) => (
				<span
					key={`${bee.top}-${bee.left}`}
					className="absolute select-none"
					style={{
						top: bee.top,
						left: bee.left,
						fontSize: bee.size,
						opacity: bee.opacity,
						// @ts-expect-error CSS custom property
						"--bee-rotate": `${bee.rotate}deg`,
						animation: `bee-drift ${bee.duration}s ease-in-out ${bee.delay}s infinite`,
					}}
				>
					🐝
				</span>
			))}

			<div className="relative z-10 text-center">
				{title && (
					<h1 className="text-[5rem] leading-[1.1] font-black tracking-tight text-foreground">
						{title}
					</h1>
				)}
				<div className="mt-8 text-xl text-foreground/70">{children}</div>
			</div>
		</div>
	);
}

export const demo: LayoutDemo = {
	mdx: `---
layout: BeeCover
---

# Honeydeck

Build memorable slide decks with MDX, React, and a little bee magic.`,
};
