"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import { ScoreTrendsResponse } from "@/types/audit";
import { logger } from "@/lib/logger";

interface TrendData {
	month: string;
	score: number;
	waste: number;
}

interface ClutterscoreTrendProps {
	className?: string;
}

export function ClutterscoreTrend({ className }: ClutterscoreTrendProps) {
	const [trends, setTrends] = useState<TrendData[]>([]);
	const [period, setPeriod] = useState<"30" | "90">("30");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/dashboard/trends?months=${period === "30" ? 3 : 6}`)
			.then((res) => res.json())
			.then((data: ScoreTrendsResponse) => {
				setTrends(
					data.trends.map((t) => ({
						month: new Date(t.month + "-01").toLocaleDateString(
							"en-US",
							{ month: "short" }
						),
						score: t.score,
						waste: t.waste,
					}))
				);
				setLoading(false);
			})
			.catch((err) => {
				logger.error("Failed to fetch trends:", err);
				setLoading(false);
			});
	}, [period]);

	if (loading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Hygiene Trend
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-[200px] animate-pulse bg-muted rounded" />
				</CardContent>
			</Card>
		);
	}

	const latestScore = trends[trends.length - 1]?.score || 0;
	const previousScore = trends[trends.length - 2]?.score || 0;
	const scoreDelta = latestScore - previousScore;
	const isImproving = scoreDelta > 0;

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
						Weekly Clutterscore Trend
						{scoreDelta !== 0 && (
							<span
								className={`flex items-center gap-1 text-xs ${isImproving ? "text-green-600" : "text-red-600"}`}
							>
								{isImproving ? (
									<TrendingUp className="h-3 w-3" />
								) : (
									<TrendingDown className="h-3 w-3" />
								)}
								{Math.abs(scoreDelta)} pts
							</span>
						)}
					</CardTitle>
					<div className="flex gap-2">
						<Button
							variant={period === "30" ? "outline" : "ghost"}
							size="sm"
							className="h-7 text-xs"
							onClick={() => setPeriod("30")}
						>
							30d
						</Button>
						<Button
							variant={period === "90" ? "outline" : "ghost"}
							size="sm"
							className="h-7 text-xs"
							onClick={() => setPeriod("90")}
						>
							90d
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="h-[200px] w-full">
					{trends.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={trends}>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="hsl(var(--border))"
								/>
								<XAxis
									dataKey="month"
									stroke="hsl(var(--muted-foreground))"
									fontSize={12}
									tickLine={false}
								/>
								<YAxis
									stroke="hsl(var(--muted-foreground))"
									fontSize={12}
									tickLine={false}
									domain={[0, 100]}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "hsl(var(--card))",
										border: "1px solid hsl(var(--border))",
										borderRadius: "8px",
									}}
									formatter={(
										value: number,
										name: string
									) => [
										name === "score"
											? `${value}/100`
											: `$${value.toLocaleString()}`,
										name === "score" ? "Score" : "Waste",
									]}
								/>
								<Line
									type="monotone"
									dataKey="score"
									stroke="hsl(var(--primary))"
									strokeWidth={2}
									dot={{ fill: "hsl(var(--primary))", r: 4 }}
									activeDot={{ r: 6 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : (
						<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
							No trend data available yet
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
