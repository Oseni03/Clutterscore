interface Stats {
	total: number;
	security: number;
	savings: number;
	efficiency: number;
}

interface SummaryStatsProps {
	stats: Stats;
}

export default function SummaryStats({ stats }: SummaryStatsProps) {
	return (
		<div className="mt-8 pt-6 border-t">
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="text-center">
					<p className="text-2xl md:text-3xl font-bold">
						{stats.total}
					</p>
					<p className="text-xs md:text-sm text-muted-foreground">
						Total Playbooks
					</p>
				</div>
				<div className="text-center">
					<p className="text-2xl md:text-3xl font-bold text-red-600">
						{stats.security}
					</p>
					<p className="text-xs md:text-sm text-muted-foreground">
						Security Risks
					</p>
				</div>
				<div className="text-center">
					<p className="text-2xl md:text-3xl font-bold text-green-600">
						{stats.savings}
					</p>
					<p className="text-xs md:text-sm text-muted-foreground">
						Cost Savings
					</p>
				</div>
				<div className="text-center">
					<p className="text-2xl md:text-3xl font-bold text-blue-600">
						{stats.efficiency}
					</p>
					<p className="text-xs md:text-sm text-muted-foreground">
						Efficiency Gains
					</p>
				</div>
			</div>
		</div>
	);
}
