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
			<Card className="border-green-200 bg-green-50">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-900">
						<DollarSign className="h-5 w-5" />
						Loading Savings...
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-20 animate-pulse bg-green-100 rounded" />
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
		<Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-green-900">
					<span className="flex items-center gap-2">
						<DollarSign className="h-5 w-5" />
						Savings Tracker
					</span>
					{isImproving ? (
						<TrendingUp className="h-5 w-5 text-green-600" />
					) : (
						<TrendingDown className="h-5 w-5 text-orange-600" />
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<div className="text-sm font-medium text-green-800">
						Saved This Month
					</div>
					<div className="text-3xl font-bold text-green-900">
						${data.monthlySavings.toLocaleString()}
					</div>
				</div>

				<div className="pt-4 border-t border-green-200">
					<div className="text-sm font-medium text-green-800 mb-1">
						Estimated Annual Savings
					</div>
					<div className="text-2xl font-bold text-green-700">
						${data.estimatedAnnualSavings.toLocaleString()}/year
					</div>
				</div>

				<div className="pt-4 border-t border-green-200">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-medium text-green-800">
							Progress to Target
						</span>
						<span className="text-sm font-semibold text-green-900">
							{data.clutterscore}/{data.targetScore}
						</span>
					</div>
					<div className="w-full bg-green-200 rounded-full h-3">
						<div
							className="h-3 rounded-full bg-green-600 transition-all duration-500"
							style={{
								width: `${Math.min(scoreProgress, 100)}%`,
							}}
						/>
					</div>
					<div className="text-xs text-green-700 mt-1">
						{scoreProgress >= 100
							? "🎉 Target achieved!"
							: `${100 - scoreProgress}% to go`}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
