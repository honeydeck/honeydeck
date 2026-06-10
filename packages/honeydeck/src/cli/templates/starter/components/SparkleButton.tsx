import type { CSSProperties } from "react";
import { useState } from "react";

type Particle = {
	id: number;
	color: string;
	x: number;
	y: number;
	rotate: number;
};

export function SparkleButton() {
	const [particles, setParticles] = useState<Particle[]>([]);

	function launch() {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		const colors = ["#facc15", "#38bdf8", "#a78bfa", "#fb7185", "#34d399"];
		const next = Array.from({ length: 28 }, (_, index) => {
			const angle = (Math.PI * 2 * index) / 28;
			const distance = 56 + Math.random() * 96;

			return {
				id: Date.now() + index,
				color: colors[index % colors.length],
				x: Math.cos(angle) * distance,
				y: Math.sin(angle) * distance,
				rotate: Math.random() * 360,
			};
		});

		setParticles(next);
		window.setTimeout(() => setParticles([]), 900);
	}

	return (
		<div className="relative inline-flex items-center justify-center">
			<button
				type="button"
				onClick={launch}
				className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground shadow-lg transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary/30"
			>
				Launch confetti
			</button>

			{particles.map((particle) => (
				<span
					key={particle.id}
					className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
					style={
						{
							backgroundColor: particle.color,
							"--sparkle-x": `${particle.x}px`,
							"--sparkle-y": `${particle.y}px`,
							"--sparkle-rotate": `${particle.rotate}deg`,
							animation:
								"honeydeck-sparkle 900ms cubic-bezier(.16,1,.3,1) forwards",
						} as CSSProperties
					}
				/>
			))}

			<style>{`
        @keyframes honeydeck-sparkle {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--sparkle-x)),
                calc(-50% + var(--sparkle-y))
              )
              scale(0)
              rotate(var(--sparkle-rotate));
          }
        }
      `}</style>
		</div>
	);
}
