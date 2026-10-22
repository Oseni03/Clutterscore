import Link from "next/link";

const bars = [
	{
		label: "Files",
		value: "64 / 100",
		pct: "64%",
		color: "#DDF35B",
		desc: "Stale, duplicated and forgotten documents across your drives.",
	},
	{
		label: "Users",
		value: "80 / 100",
		pct: "80%",
		color: "#F4B183",
		desc: "Inactive accounts and seats you pay for but do not use.",
	},
	{
		label: "Channels",
		value: "55 / 100",
		pct: "55%",
		color: "#B9A9D6",
		desc: "Quiet channels and spaces that no longer earn their place.",
	},
	{
		label: "Money and storage",
		value: "70 / 100",
		pct: "70%",
		color: "#8FA9A8",
		desc: "An estimate of what the clutter costs, shown beside the score.",
	},
];

function AuditedBand() {
	return (
		<section className="mt-28 bg-night px-6 py-24 text-paper">
			<div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12">
				<div className="min-w-0 flex-1 basis-[360px]">
					<div className="text-[13px] font-medium text-[#A8A8A2]">
						What gets audited
					</div>
					<h2 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-[48px]">
						One score for everything that{" "}
						<span className="inline-block rounded-md bg-lime px-3 text-ink">
							piles up
						</span>
					</h2>
					<p className="mt-5 max-w-[480px] text-[18px] text-[#A8A8A2]">
						Clutterscore audits files, users and channels, then
						estimates the money and storage you are wasting.
					</p>
					<Link
						href="/signup"
						className="mt-7 inline-block rounded-full bg-lime px-6 py-3.5 text-[15px] font-semibold text-ink transition-opacity hover:opacity-70"
					>
						Run your first audit
					</Link>
				</div>

				<div className="min-w-0 flex-1 basis-[440px] rounded-xl bg-panel p-7">
					<div className="flex items-center justify-between gap-3 pb-4">
						<span className="text-[13px] font-medium text-[#A8A8A2]">
							Score breakdown
						</span>
						<span className="rounded-sm bg-lime px-2.5 py-1 text-[12px] font-medium text-ink">
							Sample
						</span>
					</div>
					{bars.map((bar) => (
						<div
							key={bar.label}
							className="border-t border-[#2A2A2A] py-[18px]"
						>
							<div className="flex justify-between gap-3 text-[15px] font-semibold">
								<span>{bar.label}</span>
								<span>{bar.value}</span>
							</div>
							<div className="mt-2.5 h-2 rounded-full bg-[#2A2A2A]">
								<div
									className="h-2 rounded-full"
									style={{
										width: bar.pct,
										backgroundColor: bar.color,
									}}
								/>
							</div>
							<div className="mt-2 text-[13px] text-[#A8A8A2]">
								{bar.desc}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export default AuditedBand;
