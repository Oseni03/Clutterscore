import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaybooksHeaderProps {
	onRunAudit: () => void;
	onRefresh: () => void;
	isAuditRunning: boolean;
	isRefreshing: boolean;
	isThrottled: boolean;
}

export default function PlaybooksHeader({
	onRunAudit,
	onRefresh,
	isAuditRunning,
	isRefreshing,
	isThrottled,
}: PlaybooksHeaderProps) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 className="font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[36px]">
					Playbooks
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Safe cleanup plans drafted from your latest audit. Review
					each one before anything runs.
				</p>
			</div>
			<div className="flex flex-wrap gap-3">
				<Button
					variant="outline"
					onClick={onRefresh}
					disabled={isRefreshing}
					className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
				>
					{isRefreshing && (
						<Loader2 className="size-4 animate-spin" />
					)}
					Refresh
				</Button>
				<Button
					onClick={onRunAudit}
					disabled={isAuditRunning || isThrottled}
					className="h-11 rounded-full px-5 text-sm font-semibold"
				>
					{isAuditRunning ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Running...
						</>
					) : isThrottled ? (
						<>
							<Crown className="size-4" />
							Upgrade to run
						</>
					) : (
						"Run audit"
					)}
				</Button>
			</div>
		</div>
	);
}
