"use client";

import { Button } from "@/components/ui/button";
import { History, Loader2, RefreshCw, Crown } from "lucide-react";

interface DashboardHeaderProps {
	auditedAt: string | Date;
	isRefreshing: boolean;
	isThrottled: boolean;
	onRunAudit: () => void;
	onViewLogs: () => void;
}

export default function DashboardHeader({
	auditedAt,
	isRefreshing,
	isThrottled,
	onRunAudit,
	onViewLogs,
}: DashboardHeaderProps) {
	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
			<div>
				<h1 className="text-xl md:text-2xl font-bold text-foreground">
					Dashboard
				</h1>
				<p className="text-xs md:text-sm text-muted-foreground mt-1">
					Last updated {new Date(auditedAt).toLocaleString()}
				</p>
			</div>
			<div className="flex gap-2">
				<Button onClick={onViewLogs} variant="outline" size="sm">
					<History className="mr-2 h-4 w-4" />
					Audit Logs
				</Button>
				<Button
					onClick={onRunAudit}
					disabled={isRefreshing || isThrottled}
					variant={isThrottled ? "outline" : "outline"}
					size="sm"
				>
					{isRefreshing ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Running...
						</>
					) : isThrottled ? (
						<>
							<Crown className="mr-2 h-4 w-4" />
							Upgrade
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Run Audit
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
