"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DashboardStats } from "@/types/audit";

interface NextScanCountdownProps {
	onRunAudit?: () => void;
	isRunning?: boolean;
}

export function NextScanCountdown({
	onRunAudit,
	isRunning,
}: NextScanCountdownProps) {
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

		const interval = setInterval(() => {
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
		}, 60000); // Update every minute

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

	const canRunAudit = stats.canRunAudit;
	const isFreeTier = stats.isFreeTier;

	return (
		<Card
			className={
				canRunAudit ? "border-green-200 bg-green-50" : "border-border"
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
							<div className="text-3xl font-bold text-green-600">
								Available Now
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								{stats.lastAuditDate
									? `Last scan: ${new Date(stats.lastAuditDate).toLocaleDateString()}`
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
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{timeLeft}
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Until next free scan
							</p>
							{stats.lastAuditDate && (
								<p className="text-xs text-muted-foreground mt-2">
									Last scan:{" "}
									{new Date(
										stats.lastAuditDate
									).toLocaleDateString()}
								</p>
							)}
						</div>
						<div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
							<Lock className="h-4 w-4 text-orange-600 mx-auto mb-2" />
							<p className="text-xs text-orange-800">
								{isFreeTier
									? "Free tier: 1 scan every 30 days"
									: "Next scan unlocks soon"}
							</p>
							{isFreeTier && (
								<Button
									variant="link"
									size="sm"
									className="text-orange-600 text-xs mt-2 h-auto p-0"
									onClick={() =>
										(window.location.href = "/pricing")
									}
								>
									Upgrade for unlimited scans →
								</Button>
							)}
						</div>
					</>
				)}

				{stats.pendingPlaybooks > 0 && (
					<div className="pt-3 border-t">
						<p className="text-xs text-muted-foreground text-center">
							You have <strong>{stats.pendingPlaybooks}</strong>{" "}
							pending action
							{stats.pendingPlaybooks !== 1 ? "s" : ""}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
