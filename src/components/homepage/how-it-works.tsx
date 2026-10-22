const steps = [
	{
		n: "01",
		title: "Connect",
		body: "Authorize Google, Slack, Dropbox or Notion from Settings. Tokens refresh automatically.",
	},
	{
		n: "02",
		title: "Audit",
		body: "Clutterscore scans files, users and channels across every connected tool.",
	},
	{
		n: "03",
		title: "Score",
		body: "Get a single 0 to 100 ClutterScore for your workspace.",
	},
	{
		n: "04",
		title: "Estimate",
		body: "See the money and storage the clutter is costing you.",
	},
	{
		n: "05",
		title: "Review",
		body: "An AI-drafted playbook lists each proposed cleanup action for an admin to read.",
	},
	{
		n: "06",
		title: "Approve and undo",
		body: "Run it once approved, and reverse any change for 30 days.",
	},
];

function HowItWorks() {
	return (
		<section
			id="how"
			className="mx-auto max-w-[1200px] px-6 pt-28"
		>
			<div className="flex flex-wrap gap-x-12 gap-y-6">
				<div className="flex-1 basis-[200px] text-[13px] font-medium text-muted-foreground">
					How it works
				</div>
				<div className="min-w-0 flex-[3_1_480px]">
					<h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
						From connected to clean in six steps
					</h2>
					<p className="mt-3 max-w-[560px] text-muted-foreground">
						Every workspace connects its tools, runs audits, and owns
						its playbooks, audit logs, billing and members.
					</p>
				</div>
			</div>

			<div className="mt-10 flex flex-wrap gap-5">
				{steps.map((step) => (
					<div
						key={step.n}
						className="min-h-[180px] flex-1 basis-[340px] rounded-md bg-muted p-6"
					>
						<div className="text-[13px] font-medium text-muted-foreground">
							{step.n}
						</div>
						<div className="mt-10 font-display text-[22px] font-semibold">
							{step.title}
						</div>
						<p className="mt-2 text-[14px] text-muted-foreground">
							{step.body}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

export default HowItWorks;
