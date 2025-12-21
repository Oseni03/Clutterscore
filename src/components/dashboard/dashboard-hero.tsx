"use client";

import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { SavingsTracker } from "@/components/dashboard/savings-tracker";
import { NextScanCountdown } from "@/components/dashboard/next-scan-countdown";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardHeroProps {
	score: number;
	previousScore?: number;
	targetScore: number;
	estimatedSavings: number;
	storageWaste: number;
	licenseWaste: number;
	activeRisks: number;
	criticalRisks: number;
	moderateRisks: number;
	isThrottled: boolean;
	isRefreshing: boolean;
	onRunAudit: () => void;
}

export default function DashboardHero({
	score,
	previousScore,
	targetScore,
	estimatedSavings,
	storageWaste,
	licenseWaste,
	activeRisks,
	criticalRisks,
	moderateRisks,
	isThrottled,
	isRefreshing,
	onRunAudit,
}: DashboardHeroProps) {
	return (
		<div className="grid md:grid-cols-12 gap-4 md:gap-6">
			{/* Score Card */}
			<Card className="md:col-span-3 flex flex-col items-center justify-center p-6 border-border/60 shadow-sm relative overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent pointer-events-none" />
				<h3 className="text-xs md:text-sm font-medium text-muted-foreground mb-4 w-full text-center uppercase tracking-wider">
					Clutterscore
				</h3>
				<ScoreRing score={score} size={140} />
				<div className="mt-4 flex gap-4 text-center">
					{previousScore !== undefined && (
						<>
							<div>
								<p className="text-xs text-muted-foreground">
									Last
								</p>
								<p className="text-sm font-bold text-muted-foreground">
									{previousScore}
								</p>
							</div>
							<div className="w-px h-8 bg-border" />
						</>
					)}
					<div>
						<p className="text-xs text-muted-foreground">Target</p>
						<p className="text-sm font-bold text-emerald-600">
							{targetScore}
						</p>
					</div>
				</div>
			</Card>

			{/* Waste Metrics */}
			<div className="md:col-span-5 grid grid-cols-1 gap-4">
				<Card className="p-4 border-border/60 shadow-sm">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">
								Projected Annual Waste
							</p>
							<h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
								{formatCurrency(estimatedSavings)}
							</h3>
						</div>
						<div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
							<TrendingUp className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 flex justify-between text-xs text-muted-foreground">
						<span>Storage: {formatCurrency(storageWaste)}</span>
						<span>Licenses: {formatCurrency(licenseWaste)}</span>
					</div>
				</Card>

				<Card className="p-4 border-border/60 shadow-sm">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-1">
								Active Risks
							</p>
							<h3 className="text-2xl md:text-3xl font-display font-bold text-foreground">
								{activeRisks}
							</h3>
						</div>
						<div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center dark:bg-orange-900/30">
							<AlertTriangle className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-3 text-xs text-muted-foreground">
						<span className="text-orange-600 font-medium">
							{criticalRisks} Critical
						</span>{" "}
						•{" "}
						<span className="text-yellow-600 font-medium">
							{moderateRisks} Moderate
						</span>
					</div>
				</Card>
			</div>

			{/* Right Column */}
			<div className="md:col-span-4 grid grid-cols-1 gap-4">
				<SavingsTracker />
				<NextScanCountdown
					onRunAudit={onRunAudit}
					isRunning={isRefreshing}
					isThrottled={isThrottled}
				/>
			</div>
		</div>
	);
}
