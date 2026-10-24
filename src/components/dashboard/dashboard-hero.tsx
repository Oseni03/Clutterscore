"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/ui/score-ring";
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
	monthlySavings: number;
	estimatedAnnualSavings: number;
	nextScanDate: string | Date | null;
}

function getTimeLeft(date: string | Date) {
	const diff = new Date(date).getTime() - Date.now();

	if (diff <= 0) return "ready";

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor(
		(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
	);
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
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
	monthlySavings,
	estimatedAnnualSavings,
	nextScanDate,
}: DashboardHeroProps) {
	const [timeLeft, setTimeLeft] = useState("");

	useEffect(() => {
		if (!nextScanDate) return;

		const update = () => setTimeLeft(getTimeLeft(nextScanDate));
		update();

		const interval = setInterval(update, 60_000);
		return () => clearInterval(interval);
	}, [nextScanDate]);

	const totalWaste = storageWaste + licenseWaste;
	const storageShare = totalWaste > 0 ? (storageWaste / totalWaste) * 100 : 0;
	const licenseShare = totalWaste > 0 ? (licenseWaste / totalWaste) * 100 : 0;
	const criticalShare =
		activeRisks > 0 ? (criticalRisks / activeRisks) * 100 : 0;
	const scoreProgress =
		targetScore > 0
			? Math.min(100, Math.round((score / targetScore) * 100))
			: 0;

	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<div className="rounded-md border border-border bg-background p-5">
				<p className="text-[13px] font-medium text-muted-foreground">
					ClutterScore
				</p>
				<div className="mt-3 flex justify-center">
					<ScoreRing score={score} size={140} />
				</div>
				<div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium">
					{previousScore !== undefined && (
						<span className="rounded-sm bg-muted px-2.5 py-1">
							Previous {previousScore}
						</span>
					)}
					<span className="rounded-sm bg-lime px-2.5 py-1 text-ink">
						Target {targetScore}
					</span>
				</div>
			</div>

			<div className="rounded-md border border-border bg-background p-5">
				<p className="text-[13px] font-medium text-muted-foreground">
					Projected annual waste
				</p>
				<p className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
					{formatCurrency(estimatedSavings)}
				</p>
				<div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted">
					<span
						className="bg-[#8FA9A8]"
						style={{ width: `${storageShare}%` }}
					/>
					<span
						className="bg-[#B9A9D6]"
						style={{ width: `${licenseShare}%` }}
					/>
				</div>
				<div className="mt-4 space-y-2 text-[13px]">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-[#8FA9A8]" />
							Storage
						</span>
						<span className="font-semibold">
							{formatCurrency(storageWaste)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-[#B9A9D6]" />
							Licenses
						</span>
						<span className="font-semibold">
							{formatCurrency(licenseWaste)}
						</span>
					</div>
				</div>
			</div>

			<div className="rounded-md border border-border bg-background p-5">
				<p className="text-[13px] font-medium text-muted-foreground">
					Active risks
				</p>
				<p className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
					{activeRisks}
				</p>
				<div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-muted">
					<span
						className="bg-[#F4B183]"
						style={{ width: `${criticalShare}%` }}
					/>
				</div>
				<div className="mt-4 space-y-2 text-[13px]">
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-[#F4B183]" />
							Critical
						</span>
						<span className="font-semibold">{criticalRisks}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-border" />
							Moderate
						</span>
						<span className="font-semibold">{moderateRisks}</span>
					</div>
				</div>
			</div>

			<div className="rounded-md bg-night p-5 text-paper">
				<p className="text-[13px] font-medium text-[#A8A8A2]">
					Savings tracker
				</p>
				<p className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-lime">
					{formatCurrency(monthlySavings)}
				</p>
				<p className="text-xs text-[#A8A8A2]">saved this month</p>
				<div className="mt-4 flex items-center justify-between text-[13px]">
					<span className="text-[#A8A8A2]">
						Est. annual savings
					</span>
					<span className="font-semibold">
						{formatCurrency(estimatedAnnualSavings)}
					</span>
				</div>
				<div className="mt-4 flex items-center justify-between text-xs text-[#A8A8A2]">
					<span>Progress to target</span>
					<span>{scoreProgress}%</span>
				</div>
				<div className="mt-2 h-2 rounded-full bg-[#2A2A2A]">
					<div
						className="h-2 rounded-full bg-lime"
						style={{ width: `${scoreProgress}%` }}
					/>
				</div>
				<div className="mt-4 border-t border-[#2A2A2A] pt-3 text-xs text-[#A8A8A2]">
					{nextScanDate ? (
						timeLeft === "ready" ? (
							"Next scan ready"
						) : (
							<>
								Next scan in{" "}
								<span className="font-semibold text-paper">
									{timeLeft || "…"}
								</span>
							</>
						)
					) : (
						"Next scan not scheduled"
					)}
				</div>
			</div>
		</div>
	);
}
