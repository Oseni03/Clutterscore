import { Button } from "@/components/ui/button";
import { Crown, Loader2, RefreshCw } from "lucide-react";

interface NoPlaybooksMessageProps {
	onRunAudit: () => void;
	isAuditRunning: boolean;
	isThrottled: boolean;
	onUpgrade: () => void;
}

export default function NoPlaybooksMessage({
	onRunAudit,
	isAuditRunning,
	isThrottled,
	onUpgrade,
}: NoPlaybooksMessageProps) {
	return (
		<div className="col-span-2">
			<div className="text-center py-12 md:py-20 border rounded-lg bg-muted/20">
				<div className="text-4xl md:text-5xl mb-4">✨</div>
				<h3 className="text-lg md:text-xl font-semibold mb-2">
					No Playbooks Yet
				</h3>
				<p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto px-4">
					Run your first audit to generate automated cleanup playbooks
					for your workspace.
				</p>
				{isThrottled ? (
					<div className="space-y-3">
						<p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
							Monthly audit limit reached
						</p>
						<Button onClick={onUpgrade} variant="default">
							<Crown className="mr-2 h-4 w-4" />
							Upgrade for Unlimited Audits
						</Button>
					</div>
				) : (
					<Button onClick={onRunAudit} disabled={isAuditRunning}>
						{isAuditRunning ? (
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
				)}
			</div>
		</div>
	);
}
