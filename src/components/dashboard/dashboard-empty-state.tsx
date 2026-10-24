"use client";

import { differenceInCalendarDays } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThrottleAlert from "@/components/dashboard/throttle-alert";

interface ThrottleInfo {
	error: string;
	resetDate?: string | null;
}

interface DashboardEmptyStateProps {
	isThrottled: boolean;
	throttleInfo?: ThrottleInfo | null;
	isRefreshing: boolean;
	onRunAudit: () => void;
	onUpgrade: () => void;
}

export default function DashboardEmptyState({
	isThrottled,
	throttleInfo,
	isRefreshing,
	onRunAudit,
	onUpgrade,
}: DashboardEmptyStateProps) {
	const daysUntilReset = throttleInfo?.resetDate
		? differenceInCalendarDays(
				new Date(throttleInfo.resetDate),
				new Date()
			)
		: null;

	return (
		<div className="space-y-6 p-6 md:p-8">
			<div>
				<h1 className="font-display text-[28px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[36px]">
					Overview
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Your workspace health will appear here after your first
					audit.
				</p>
			</div>

			{isThrottled && throttleInfo && (
				<ThrottleAlert
					throttleInfo={throttleInfo}
					onUpgrade={onUpgrade}
				/>
			)}

			<div className="flex flex-col items-center rounded-xl border border-border bg-background px-6 py-16 text-center sm:px-8">
				<div
					aria-hidden="true"
					className="size-24 rounded-full bg-orb"
				/>
				<h2 className="mt-7 font-display text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">
					No audit yet
				</h2>
				<p className="mt-3 max-w-[460px] text-muted-foreground">
					Run your first audit to get your ClutterScore, a waste
					estimate and a list of cleanup playbooks.
				</p>

				{isThrottled ? (
					<span className="mt-7 inline-flex h-12 items-center rounded-full bg-muted px-7 text-[15px] font-semibold text-muted-foreground">
						{daysUntilReset && daysUntilReset > 0
							? `Run audit in ${daysUntilReset} day${daysUntilReset === 1 ? "" : "s"}`
							: "Run audit unavailable"}
					</span>
				) : (
					<Button
						onClick={onRunAudit}
						disabled={isRefreshing}
						className="mt-7 h-12 rounded-full bg-lime px-7 text-[15px] font-semibold text-ink hover:bg-lime/85"
					>
						{isRefreshing ? (
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
		</div>
	);
}
