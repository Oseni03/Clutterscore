import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/audit";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";

interface SavingsData {
	monthlySavings: number;
	estimatedAnnualSavings: number;
	clutterscore: number;
	targetScore: number;
}

export function SavingsTracker() {
	const [data, setData] = useState<SavingsData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/dashboard/stats")
			.then((res) => res.json())
			.then((stats: DashboardStats) => {
				setData({
					monthlySavings: stats.monthlySavings,
					estimatedAnnualSavings: stats.estimatedAnnualSavings,
					clutterscore: stats.clutterscore,
					targetScore: stats.targetScore,
				});
				setLoading(false);
			})
			.catch((err) => {
				console.error("Failed to fetch savings:", err);
				setLoading(false);
			});
	}, []);

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Loading Savings...
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-20 animate-pulse rounded-md bg-border" />
				</CardContent>
			</Card>
		);
	}

	if (!data) return null;

	const scoreProgress = Math.round(
		(data.clutterscore / data.targetScore) * 100
	);
	const isImproving = data.clutterscore >= data.targetScore * 0.8;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Savings Tracker
					</span>
					{isImproving ? (
						<TrendingUp className="h-5 w-5 text-foreground" />
					) : (
						<TrendingDown className="h-5 w-5 text-destructive" />
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<div className="text-sm font-medium text-muted-foreground">
						Saved This Month
					</div>
					<div className="text-3xl font-display font-semibold text-foreground">
						${data.monthlySavings.toLocaleString()}
					</div>
				</div>

				<div className="border-t border-border pt-4">
					<div className="text-sm font-medium text-muted-foreground mb-1">
						Estimated Annual Savings
					</div>
					<div className="text-2xl font-display font-semibold text-foreground">
						${data.estimatedAnnualSavings.toLocaleString()}/year
					</div>
				</div>

				<div className="border-t border-border pt-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-muted-foreground">
							Progress to Target
						</span>
						<span className="text-sm font-semibold text-foreground">
							{data.clutterscore}/{data.targetScore}
						</span>
					</div>
					<div className="h-3 w-full rounded-full bg-border">
						<div
							className="h-3 rounded-full bg-lime transition-all duration-500"
							style={{
								width: `${Math.min(scoreProgress, 100)}%`,
							}}
						/>
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{scoreProgress >= 100
							? "🎉 Target achieved!"
							: `${100 - scoreProgress}% to go`}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
