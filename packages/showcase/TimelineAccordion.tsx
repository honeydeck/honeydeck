import { useTimelineSteps } from "@honeydeck/runtime";

const items = [
	{
		title: "Define the trigger",
		body: "The slide author reserves three static steps in MDX.",
	},
	{
		title: "Open the component",
		body: "The imported React component reads its local step from a hook.",
	},
	{
		title: "Return to the slide",
		body: "After the custom steps finish, normal reveals continue.",
	},
];

export function TimelineAccordion() {
	const { phase, stepIndex, stepCount, isPdfFinalRender } = useTimelineSteps();
	const activeIndex =
		phase === "before" ? -1 : Math.min(stepIndex - 1, items.length - 1);

	return (
		<section className="my-10 grid grid-cols-[320px_1fr] gap-8 rounded-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-sm">
			<div className="flex flex-col justify-between border-r border-slate-200 pr-6">
				<div>
					<p className="text-sm font-semibold uppercase tracking-normal text-sky-700">
						Custom component
					</p>
					<p className="mt-3 font-semibold leading-tight">
						Accordion driven by local timeline steps
					</p>
				</div>
				<p className="mt-8 text-slate-600">
					{phase === "before"
						? "Waiting for this component timeline."
						: `Local step ${stepIndex} of ${stepCount}`}
				</p>
			</div>

			<div className="space-y-3">
				{items.map((item, index) => {
					const isOpen = isPdfFinalRender || index === activeIndex;

					return (
						<div
							key={item.title}
							className={`rounded-md border transition-colors ${
								isOpen
									? "border-sky-500 bg-sky-50"
									: "border-slate-200 bg-slate-50"
							}`}
						>
							<h3>
								<button
									type="button"
									aria-expanded={isOpen}
									className="flex w-full items-center justify-between px-5 py-4 text-left text-2xl font-semibold"
								>
									<span>{item.title}</span>
									<span className="text-xl text-slate-500">
										{isOpen ? "-" : "+"}
									</span>
								</button>
							</h3>
							<div
								className={`overflow-hidden px-5 text-xl text-slate-700 transition-all ${
									isOpen ? "max-h-32 pb-5 opacity-100" : "max-h-0 opacity-0"
								}`}
							>
								{item.body}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}
