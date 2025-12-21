import { Button } from "@/components/ui/button";
import { Crown, Loader2, RefreshCw } from "lucide-react";

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
		<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
			<div>
				<h1 className="text-xl md:text-2xl font-display font-bold">
					Cleanup Playbooks
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					One-click actions to improve your digital hygiene.
				</p>
			</div>
			<div className="flex gap-2 w-full md:w-auto">
				<Button
					variant="outline"
					onClick={onRefresh}
					disabled={isRefreshing}
					size="sm"
				>
					{isRefreshing ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<RefreshCw className="mr-2 h-4 w-4" />
					)}
					Refresh
				</Button>
				<Button
					onClick={onRunAudit}
					disabled={isAuditRunning || isThrottled}
					size="sm"
					variant={isThrottled ? "outline" : "default"}
				>
					{isAuditRunning ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Running...
						</>
					) : isThrottled ? (
						<>
							<Crown className="mr-2 h-4 w-4" />
							Upgrade to Run
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
