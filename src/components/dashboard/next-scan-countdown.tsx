"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Crown, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DashboardStats } from "@/types/audit";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface NextScanCountdownProps {
	onRunAudit?: () => void;
	isRunning?: boolean;
	isThrottled?: boolean;
}

export function NextScanCountdown({
	onRunAudit,
	isRunning,
	isThrottled = false,
}: NextScanCountdownProps) {
	const router = useRouter();
	const [stats, setStats] = useState<DashboardStats | null>(null);
	const [timeLeft, setTimeLeft] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/dashboard/stats")
			.then((res) => res.json())
			.then((data) => {
				setStats(data);
				setLoading(false);
			})
			.catch((err) => {
				console.error("Failed to fetch stats:", err);
				setLoading(false);
			});
	}, []);

	useEffect(() => {
		if (!stats?.nextScanDate) return;

		const updateCountdown = () => {
			const now = new Date();
			const next = new Date(stats.nextScanDate!);
			const diff = next.getTime() - now.getTime();

			if (diff <= 0) {
				setTimeLeft("Available now");
				return;
			}

			const days = Math.floor(diff / (1000 * 60 * 60 * 24));
			const hours = Math.floor(
				(diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
			);
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

			if (days > 0) {
				setTimeLeft(`${days}d ${hours}h ${minutes}m`);
			} else if (hours > 0) {
				setTimeLeft(`${hours}h ${minutes}m`);
			} else {
				setTimeLeft(`${minutes}m`);
			}
		};

		// Update immediately
		updateCountdown();

		// Then update every minute
		const interval = setInterval(updateCountdown, 60000);

		return () => clearInterval(interval);
	}, [stats]);

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<Clock className="h-4 w-4" />
						Next Scan
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-16 animate-pulse bg-muted rounded" />
				</CardContent>
			</Card>
		);
	}

	if (!stats) return null;

	const canRunAudit = stats.canRunAudit && !isThrottled;
	const isFreeTier = stats.isFreeTier;
	// const showThrottleUI = isThrottled || !canRunAudit;

	return (
		<Card
			className={
				canRunAudit
					? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
					: "border-border"
			}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
					<Clock className="h-4 w-4" />
					Next Scan Availability
					{isFreeTier && (
						<Badge variant="secondary" className="ml-auto text-xs">
							FREE TIER
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{canRunAudit ? (
					<>
						<div className="text-center">
							<div className="text-3xl font-bold text-green-600 dark:text-green-500">
								Available Now
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{stats.lastAuditDate
									? `Last scan: ${format(new Date(stats.lastAuditDate), "MMM d, yyyy")}`
									: "Ready for your first scan"}
							</p>
						</div>
						<Button
							onClick={onRunAudit}
							disabled={isRunning}
							className="w-full"
							size="sm"
						>
							{isRunning ? (
								<>
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
									Running Scan...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Run Scan Now
								</>
							)}
						</Button>
					</>
				) : (
					<>
						<div className="text-center space-y-2">
							{stats.nextScanDate && (
								<>
									<div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
										{timeLeft}
									</div>
									<p className="text-xs text-muted-foreground">
										Until next free scan
									</p>
								</>
							)}
							{stats.lastAuditDate && (
								<div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
									<Calendar className="h-3 w-3" />
									<span>
										Last scan:{" "}
										{format(
											new Date(stats.lastAuditDate),
											"MMM d, yyyy"
										)}
									</span>
								</div>
							)}
						</div>

						<div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-3">
							<div className="text-center space-y-2">
								<div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50">
									<Crown className="h-5 w-5 text-orange-600 dark:text-orange-500" />
								</div>
								<p className="text-sm font-medium text-orange-900 dark:text-orange-100">
									{isFreeTier
										? "Free tier: 1 scan per month"
										: "Audit limit reached"}
								</p>
								<p className="text-xs text-orange-700 dark:text-orange-300">
									Upgrade to Pro for unlimited scans anytime
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								className="w-full border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/50"
								onClick={() => router.push("/pricing")}
							>
								<Crown className="mr-2 h-4 w-4" />
								View Pro Plans
							</Button>
						</div>
					</>
				)}

				{stats.pendingPlaybooks > 0 && (
					<div className="pt-3 border-t">
						<p className="text-xs text-muted-foreground text-center">
							You have{" "}
							<strong className="text-foreground">
								{stats.pendingPlaybooks}
							</strong>{" "}
							pending action
							{stats.pendingPlaybooks !== 1 ? "s" : ""}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
