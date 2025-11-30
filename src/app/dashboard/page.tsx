"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AreaChart,
	Area,
	XAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { PlaybookCard } from "@/components/playbook-card";
import { ScoreRing } from "@/components/ui/score-ring";
import {
	TrendingUp,
	AlertTriangle,
	RefreshCw,
	AlertCircle,
	Loader2,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useRouter } from "next/navigation";

const DashboardPage = () => {
	const router = useRouter();
	const {
		auditData,
		isLoading,
		isRefreshing,
		error,
		selectedTrendPeriod,
		runAudit,
		setSelectedTrendPeriod,
		getFilteredTrends,
		getPreviousScore,
	} = useDashboard();

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	// Loading skeleton
	if (isLoading) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<div className="flex items-center justify-between">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-10 w-32" />
				</div>

				<div className="grid md:grid-cols-12 gap-4 md:gap-6">
					<Skeleton className="md:col-span-4 h-[320px]" />
					<div className="md:col-span-8 space-y-4 md:space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
							<Skeleton className="h-[140px]" />
							<Skeleton className="h-[140px]" />
						</div>
						<Skeleton className="h-[240px]" />
					</div>
				</div>

				<div className="space-y-4">
					<Skeleton className="h-8 w-64" />
					<div className="grid lg:grid-cols-2 gap-4 md:gap-6">
						{[1, 2, 3, 4].map((i) => (
							<Skeleton key={i} className="h-[200px]" />
						))}
					</div>
				</div>
			</div>
		);
	}

	// Empty state - no audit data
	if (!auditData) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-xl md:text-2xl font-bold text-foreground">
						Dashboard
					</h1>
				</div>

				<Card className="p-8 md:p-12 text-center">
					<div className="max-w-md mx-auto space-y-4">
						<div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center text-3xl">
							📊
						</div>
						<h2 className="text-lg md:text-xl font-semibold">
							No Audit Data Available
						</h2>
						<p className="text-sm md:text-base text-muted-foreground">
							Run your first audit to start tracking your
							workspace hygiene and get actionable
							recommendations.
						</p>
						<Button
							onClick={runAudit}
							disabled={isRefreshing}
							size="lg"
							className="mt-4"
						>
							{isRefreshing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Running Audit...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Run First Audit
								</>
							)}
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	const targetScore = 85;
	const previousScore = getPreviousScore();
	const trendData = getFilteredTrends();

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-xl md:text-2xl font-bold text-foreground">
						Dashboard
					</h1>
					<p className="text-xs md:text-sm text-muted-foreground mt-1">
						Last updated{" "}
						{new Date(auditData.auditedAt).toLocaleString()}
					</p>
				</div>
				<Button
					onClick={runAudit}
					disabled={isRefreshing}
					variant="outline"
					size="sm"
				>
					{isRefreshing ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Running...
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Run Audit
						</>
					)}
				</Button>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Overview Section */}
			<div className="grid md:grid-cols-12 gap-4 md:gap-6">
				{/* Score Card */}
				<Card className="md:col-span-4 flex flex-col items-center justify-center p-6 border-border/60 shadow-sm relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent pointer-events-none"></div>
					<h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-6 w-full text-center uppercase tracking-wider">
						Current Hygiene Score
					</h3>
					<ScoreRing score={auditData.score} size={160} />
					<div className="mt-6 flex gap-4 text-center">
						{previousScore !== null && (
							<>
								<div>
									<p className="text-xs text-muted-foreground">
										Last Month
									</p>
									<p className="text-sm font-bold text-muted-foreground">
										{previousScore}
									</p>
								</div>
								<div className="w-px h-8 bg-border"></div>
							</>
						)}
						<div>
							<p className="text-xs text-muted-foreground">
								Target
							</p>
							<p className="text-sm font-bold text-emerald-600">
								{targetScore}
							</p>
						</div>
					</div>
				</Card>

				{/* Key Metrics */}
				<div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
					<Card className="p-4 md:p-6 border-border/60 shadow-sm flex flex-col justify-between">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">
									Projected Annual Waste
								</p>
								<h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
									{formatCurrency(auditData.estimatedSavings)}
								</h3>
							</div>
							<div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
								<TrendingUp className="h-5 w-5" />
							</div>
						</div>
						<div className="mt-4">
							<div className="flex justify-between text-xs mb-1">
								<span>
									Storage:{" "}
									{formatCurrency(auditData.storageWaste)}
								</span>
								<span>
									Licenses:{" "}
									{formatCurrency(auditData.licenseWaste)}
								</span>
							</div>
							<Progress
								value={
									(auditData.storageWaste /
										auditData.estimatedSavings) *
									100
								}
								className="h-2 bg-destructive/10 [&>div]:bg-destructive"
							/>
						</div>
					</Card>

					<Card className="p-4 md:p-6 border-border/60 shadow-sm flex flex-col justify-between">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-xs md:text-sm font-medium text-muted-foreground mb-1">
									Active Risks
								</p>
								<h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
									{auditData.activeRisks}
								</h3>
							</div>
							<div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center dark:bg-orange-900/30">
								<AlertTriangle className="h-5 w-5" />
							</div>
						</div>
						<div className="mt-4 text-xs md:text-sm text-muted-foreground">
							<span className="text-orange-600 font-medium">
								{auditData.criticalRisks} Critical
							</span>{" "}
							(Ghost Access)
							<br />
							<span className="text-yellow-600 font-medium">
								{auditData.moderateRisks} Moderate
							</span>{" "}
							(Public Links)
						</div>
					</Card>

					<Card className="col-span-1 md:col-span-2 p-4 md:p-6 border-border/60 shadow-sm">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-xs md:text-sm font-medium text-muted-foreground">
								Hygiene Trend
							</h3>
							<div className="flex gap-2">
								<Button
									variant={
										selectedTrendPeriod === "30"
											? "outline"
											: "ghost"
									}
									size="sm"
									className="h-7 text-xs"
									onClick={() => setSelectedTrendPeriod("30")}
								>
									30d
								</Button>
								<Button
									variant={
										selectedTrendPeriod === "90"
											? "outline"
											: "ghost"
									}
									size="sm"
									className="h-7 text-xs"
									onClick={() => setSelectedTrendPeriod("90")}
								>
									90d
								</Button>
							</div>
						</div>
						<div className="h-[140px] md:h-[160px] w-full">
							{trendData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={trendData}>
										<defs>
											<linearGradient
												id="colorScore"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop
													offset="0%"
													stopColor="hsl(var(--foreground))"
													stopOpacity={0.25}
												/>
												<stop
													offset="80%"
													stopColor="hsl(var(--foreground))"
													stopOpacity={0.05}
												/>
											</linearGradient>
										</defs>

										<CartesianGrid
											strokeDasharray="3 3"
											vertical={false}
											stroke="hsl(var(--border))"
										/>

										<XAxis
											dataKey="name"
											stroke="hsl(var(--muted-foreground))"
											fontSize={12}
											tickLine={false}
											axisLine={false}
										/>

										<Tooltip
											contentStyle={{
												backgroundColor:
													"hsl(var(--card))",
												borderRadius: "8px",
												border: "1px solid hsl(var(--border))",
												boxShadow:
													"0 4px 12px rgba(0,0,0,0.1)",
											}}
											itemStyle={{
												color: "hsl(var(--foreground))",
											}}
											labelStyle={{
												color: "hsl(var(--muted-foreground))",
											}}
										/>

										<Area
											type="monotone"
											dataKey="score"
											stroke="hsl(var(--foreground))"
											strokeWidth={2}
											fill="url(#colorScore)"
											isAnimationActive={true}
											animationDuration={700}
											animationEasing="ease-in-out"
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="h-full flex items-center justify-center text-muted-foreground text-sm">
									No trend data available yet
								</div>
							)}
						</div>
					</Card>
				</div>
			</div>

			{/* Playbooks Section */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg md:text-2xl font-display font-bold">
						Recommended Actions
					</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push("/dashboard/playbooks")}
					>
						View All
					</Button>
				</div>

				{auditData.playbooks && auditData.playbooks.length > 0 ? (
					<div className="grid lg:grid-cols-2 gap-4 md:gap-6">
						{auditData.playbooks.slice(0, 4).map((playbook) => (
							<PlaybookCard
								key={playbook.id}
								title={playbook.title}
								description={playbook.description}
								impact={playbook.impact}
								impactType={playbook.impactType}
								source={playbook.source}
								itemsCount={playbook.itemsCount}
								onAction={() =>
									router.push(
										`/dashboard/playbooks/${playbook.id}`
									)
								}
							/>
						))}
					</div>
				) : (
					<Card className="p-8 md:p-12 text-center">
						<div className="max-w-md mx-auto space-y-2">
							<div className="text-3xl md:text-4xl mb-2">✨</div>
							<h3 className="text-base md:text-lg font-semibold">
								No Recommendations Yet
							</h3>
							<p className="text-xs md:text-sm text-muted-foreground">
								Your workspace is clean! We&apos;ll notify you
								when we find optimization opportunities.
							</p>
						</div>
					</Card>
				)}
			</div>
		</div>
	);
};

export default DashboardPage;
