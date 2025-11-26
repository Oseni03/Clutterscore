"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { TrendingUp, AlertTriangle } from "lucide-react";

// Mock Data
const mockTrendData = [
	{ name: "Jan", score: 45, waste: 4200 },
	{ name: "Feb", score: 48, waste: 4100 },
	{ name: "Mar", score: 52, waste: 3800 },
	{ name: "Apr", score: 55, waste: 3600 },
	{ name: "May", score: 62, waste: 3200 },
	{ name: "Jun", score: 68, waste: 2800 },
	{ name: "Jul", score: 72, waste: 2400 },
];

const mockPlaybooks = [
	{
		id: 1,
		title: "Revoke 12 Ex-Employee Access Tokens",
		description:
			"Found 12 users who are disabled in Okta but still have active tokens in Slack and Dropbox.",
		impact: "Critical Risk",
		impactType: "security" as const,
		source: "slack" as const,
		itemsCount: 12,
	},
	{
		id: 2,
		title: "Archive 48 Stale Channels",
		description:
			"These channels haven't had a message in over 12 months. Archiving improves search relevance.",
		impact: "Efficiency",
		impactType: "efficiency" as const,
		source: "slack" as const,
		itemsCount: 48,
	},
	{
		id: 3,
		title: "Delete 142GB Duplicate Files",
		description:
			"Exact duplicates found across Google Drive and Dropbox shared folders.",
		impact: "$1,200/yr saved",
		impactType: "savings" as const,
		source: "google" as const,
		itemsCount: 843,
	},
	{
		id: 4,
		title: "Remove Unused Notion Guests",
		description:
			"24 guest accounts have full edit access but haven't logged in for 90 days.",
		impact: "Security Risk",
		impactType: "security" as const,
		source: "notion" as const,
		itemsCount: 24,
	},
];

const Page = () => {
	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center">
				<h1 className="text-2xl font-bold text-foreground">
					Dashboard
				</h1>
			</div>

			{/* Overview Section */}
			<div className="grid md:grid-cols-12 gap-6">
				{/* Score Card */}
				<Card className="md:col-span-4 flex flex-col items-center justify-center p-6 border-border/60 shadow-sm relative overflow-hidden">
					<div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent pointer-events-none"></div>
					<h3 className="text-sm font-medium text-muted-foreground mb-6 w-full text-center uppercase tracking-wider">
						Current Hygiene Score
					</h3>
					<ScoreRing score={72} size={180} />
					<div className="mt-6 flex gap-4 text-center">
						<div>
							<p className="text-xs text-muted-foreground">
								Last Month
							</p>
							<p className="text-sm font-bold text-muted-foreground">
								68
							</p>
						</div>
						<div className="w-px h-8 bg-border"></div>
						<div>
							<p className="text-xs text-muted-foreground">
								Target
							</p>
							<p className="text-sm font-bold text-emerald-600">
								85
							</p>
						</div>
					</div>
				</Card>

				{/* Key Metrics */}
				<div className="md:col-span-8 grid grid-cols-2 gap-6">
					<Card className="p-6 border-border/60 shadow-sm flex flex-col justify-between">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">
									Projected Annual Waste
								</p>
								<h3 className="text-3xl font-display font-bold text-foreground">
									$42,300
								</h3>
							</div>
							<div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
								<TrendingUp className="h-5 w-5" />
							</div>
						</div>
						<div className="mt-4">
							<div className="flex justify-between text-xs mb-1">
								<span>Storage: $28k</span>
								<span>Licenses: $14k</span>
							</div>
							<Progress
								value={75}
								className="h-2 bg-destructive/10 [&>div]:bg-destructive"
							/>
						</div>
					</Card>

					<Card className="p-6 border-border/60 shadow-sm flex flex-col justify-between">
						<div className="flex justify-between items-start">
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-1">
									Active Risks
								</p>
								<h3 className="text-3xl font-display font-bold text-foreground">
									14
								</h3>
							</div>
							<div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
								<AlertTriangle className="h-5 w-5" />
							</div>
						</div>
						<div className="mt-4 text-sm text-muted-foreground">
							<span className="text-orange-600 font-medium">
								3 Critical
							</span>{" "}
							(Ghost Access)
							<br />
							<span className="text-yellow-600 font-medium">
								11 Moderate
							</span>{" "}
							(Public Links)
						</div>
					</Card>

					<Card className="col-span-2 p-6 border-border/60 shadow-sm">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-sm font-medium text-muted-foreground">
								Hygiene Trend
							</h3>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									className="h-7 text-xs"
								>
									30d
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 text-xs text-muted-foreground"
								>
									90d
								</Button>
							</div>
						</div>
						<div className="h-[160px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={mockTrendData}>
									<defs>
										<linearGradient
											id="colorScore"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0.1}
											/>
											<stop
												offset="95%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0}
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
											backgroundColor: "hsl(var(--card))",
											borderRadius: "8px",
											border: "1px solid hsl(var(--border))",
										}}
										itemStyle={{
											color: "hsl(var(--foreground))",
										}}
									/>
									<Area
										type="monotone"
										dataKey="score"
										stroke="hsl(var(--muted-foreground))"
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#colorScore)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</Card>
				</div>
			</div>

			{/* Playbooks Section */}
			<div>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-display font-bold">
						Recommended Actions
					</h2>
					<Button variant="outline">View All Playbooks</Button>
				</div>

				<div className="grid lg:grid-cols-2 gap-6">
					{mockPlaybooks.map((playbook) => (
						<PlaybookCard
							key={playbook.id}
							title={playbook.title}
							description={playbook.description}
							impact={playbook.impact}
							impactType={playbook.impactType}
							source={playbook.source}
							itemsCount={playbook.itemsCount}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default Page;
