import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
		<div className="flex flex-col items-center rounded-xl border border-border bg-background px-6 py-16 text-center sm:px-8">
			<div
				aria-hidden="true"
				className="size-[88px] rounded-full bg-orb"
			/>
			<h2 className="mt-6 font-display text-[28px] font-semibold tracking-[-0.03em]">
				No playbooks yet
			</h2>
			<p className="mt-3 max-w-[420px] text-muted-foreground">
				Playbooks are drafted after an audit. Run one to see safe cleanup
				actions for your workspace.
			</p>
			{isThrottled ? (
				<Button
					onClick={onUpgrade}
					className="mt-6 h-12 px-7"
				>
					Upgrade plan
				</Button>
			) : (
				<Button
					onClick={onRunAudit}
					disabled={isAuditRunning}
					className="mt-6 h-12 rounded-full bg-lime px-7 text-[15px] font-semibold text-ink hover:bg-lime/85"
				>
					{isAuditRunning ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							Running audit...
						</>
					) : (
						"Run audit"
					)}
				</Button>
			)}
		</div>
	);
}
