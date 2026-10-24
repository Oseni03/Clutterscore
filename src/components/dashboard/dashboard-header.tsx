"use client";

import { formatDistanceToNow } from "date-fns";
import { Crown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 className="font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[36px]">
					Overview
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Last audit{" "}
					{formatDistanceToNow(new Date(auditedAt), {
						addSuffix: true,
					})}
					. Data refreshes automatically if it is more than 5 minutes
					old.
				</p>
			</div>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					onClick={onViewLogs}
					className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
				>
					View logs
				</Button>
				<Button
					onClick={onRunAudit}
					disabled={isRefreshing || isThrottled}
					className="h-11 rounded-full px-5 text-sm font-semibold"
				>
					{isRefreshing ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Running...
						</>
					) : isThrottled ? (
						<>
							<Crown className="size-4" />
							Upgrade
						</>
					) : (
						<>
							<RefreshCw className="size-4" />
							Run audit
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
