import { ArrowUpRight } from "lucide-react";

const safetyItems = [
	{
		title: "Admin approval",
		body: "Every playbook waits for a person to review and approve it before anything executes.",
	},
	{
		title: "30-day undo",
		body: "Changed your mind? Reverse a cleanup within 30 days of running it.",
	},
	{
		title: "Activity log",
		body: "Integrations added, audits run and playbooks executed are all recorded per workspace.",
	},
];

function Safety() {
	return (
		<section id="safety" className="mx-auto max-w-[1200px] px-6 pt-28">
			<div className="text-[13px] font-medium text-muted-foreground">
				Safety
			</div>
			<h2 className="mt-3 max-w-[720px] font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
				Built so an admin always stays in control
			</h2>

			<div className="mt-10 flex flex-wrap gap-5">
				{safetyItems.map((item) => (
					<div
						key={item.title}
						className="relative min-h-[200px] flex-1 basis-[280px] rounded-md bg-muted p-6"
					>
						<ArrowUpRight className="absolute right-5 top-5 h-[18px] w-[18px]" />
						<div className="mt-14 font-display text-[22px] font-semibold">
							{item.title}
						</div>
						<p className="mt-2 text-[14px] text-muted-foreground">
							{item.body}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

export default Safety;
