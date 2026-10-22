"use client";

import { useEffect, useState } from "react";
import { ScoreTrendsResponse } from "@/types/audit";

interface TrendData {
	month: string;
	score: number;
	waste: number;
}

interface ClutterscoreTrendProps {
	className?: string;
}

const PERIODS = [
	{ label: "3 months", months: 3 },
	{ label: "6 months", months: 6 },
];

export default function ClutterscoreTrend({
	className,
}: ClutterscoreTrendProps) {
	const [trends, setTrends] = useState<TrendData[]>([]);
	const [months, setMonths] = useState(6);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		setLoading(true);
		fetch(`/api/dashboard/trends?months=${months}`)
			.then((res) => res.json())
			.then((data: ScoreTrendsResponse) => {
				if (cancelled) return;

				const list = Array.isArray(data.trends) ? data.trends : [];
				setTrends(
					list.map((trend) => {
						const parsed = new Date(`${trend.month}-01`);
						const month = Number.isNaN(parsed.getTime())
							? trend.month
							: parsed.toLocaleDateString("en-US", {
									month: "short",
								});

						return {
							month,
							score: trend.score,
							waste: trend.waste,
						};
					})
				);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Failed to fetch trends:", err);
				if (!cancelled) {
					setTrends([]);
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [months]);

	const maxWaste = Math.max(...trends.map((trend) => trend.waste), 1);
	const points = trends.map((trend, index) => ({
		...trend,
		left: ((index + 0.5) / trends.length) * 100,
		top: 85 - Math.max(0, Math.min(100, trend.score)) * 0.75,
		barHeight: Math.max(0, (trend.waste / maxWaste) * 60),
	}));
	const linePath = points
		.map(
			(point, index) =>
				`${index === 0 ? "M" : "L"}${point.left} ${point.top}`
		)
		.join(" ");

	return (
		<div
			className={`rounded-md border border-border bg-background p-6 ${className ?? ""}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="font-display text-[20px] font-semibold">
						ClutterScore trend
					</h3>
					<p className="text-[13px] text-muted-foreground">
						Monthly score and projected waste
					</p>
				</div>
				<div className="inline-flex gap-1 rounded-full bg-muted p-1">
					{PERIODS.map((period) => {
						const active = months === period.months;
						return (
							<button
								key={period.months}
								type="button"
								onClick={() => setMonths(period.months)}
								aria-pressed={active}
								className={`min-h-9 rounded-full px-4 text-[13px] font-medium transition-colors ${
									active
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-background"
								}`}
							>
								{period.label}
							</button>
						);
					})}
				</div>
			</div>

			<div className="mt-4 flex flex-wrap gap-5 text-xs text-muted-foreground">
				<span className="flex items-center gap-2">
					<span className="h-[3px] w-3.5 bg-foreground" />
					ClutterScore
				</span>
				<span className="flex items-center gap-2">
					<span className="size-2.5 rounded-sm bg-[#E4DDF1]" />
					Projected waste ($K)
				</span>
			</div>

			{loading ? (
				<div className="mt-3 h-[240px] animate-pulse rounded-md bg-muted" />
			) : points.length === 0 ? (
				<div className="mt-3 flex h-[240px] items-center justify-center text-sm text-muted-foreground">
					No trend data available yet
				</div>
			) : (
				<div className="relative mt-3 h-[240px]">
					<div className="absolute inset-x-0 bottom-[15%] top-0 flex">
						{points.map((point) => (
							<div
								key={point.month}
								className="relative flex flex-1 items-end justify-center"
							>
								<div
									className={`rounded-t-sm bg-[#E4DDF1] ${
										months === 3 ? "w-14" : "w-8"
									}`}
									style={{
										height: `${point.barHeight}%`,
									}}
								/>
							</div>
						))}
					</div>

					<svg
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						className="pointer-events-none absolute inset-0 h-full w-full text-foreground"
						aria-hidden="true"
					>
						<path
							d={linePath}
							fill="none"
							stroke="currentColor"
							strokeWidth={2}
							vectorEffect="non-scaling-stroke"
							strokeLinejoin="round"
						/>
					</svg>

					{points.map((point) => (
						<div
							key={point.month}
							className="absolute -translate-x-1/2 -translate-y-1/2"
							style={{
								left: `${point.left}%`,
								top: `${point.top}%`,
							}}
						>
							<span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold">
								{point.score}
							</span>
							<span className="block size-3 rounded-full border-2 border-foreground bg-lime" />
						</div>
					))}

					<div className="absolute inset-x-0 bottom-0 flex h-[15%] items-center">
						{points.map((point) => (
							<div
								key={point.month}
								className="flex-1 text-center text-xs text-muted-foreground"
							>
								{point.month}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
