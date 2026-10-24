import { formatCurrency } from "@/lib/utils";

interface Stats {
	total: number;
	pendingItems: number;
	estimatedSavings: number;
}

interface SummaryStatsProps {
	stats: Stats;
}

export default function SummaryStats({ stats }: SummaryStatsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-3">
			<div className="rounded-md border border-border bg-background p-5">
				<p className="text-[13px] font-medium text-muted-foreground">
					Playbooks
				</p>
				<p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-[-0.03em]">
					{stats.total}
				</p>
			</div>
			<div className="rounded-md border border-border bg-background p-5">
				<p className="text-[13px] font-medium text-muted-foreground">
					Items awaiting review
				</p>
				<p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-[-0.03em]">
					{stats.pendingItems}
				</p>
			</div>
			<div className="rounded-md bg-night p-5 text-paper">
				<p className="text-[13px] font-medium text-[#A8A8A2]">
					Est. annual savings
				</p>
				<p className="mt-2 font-display text-[32px] font-semibold leading-none tracking-[-0.03em] text-lime">
					{formatCurrency(stats.estimatedSavings)}
					<span className="text-sm font-medium">/yr</span>
				</p>
			</div>
		</div>
	);
}
