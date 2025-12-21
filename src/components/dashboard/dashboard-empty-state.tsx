"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Loader2, RefreshCw, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
	return (
		<div className="p-4 md:p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl md:text-2xl font-bold text-foreground">
					Dashboard
				</h1>
			</div>

			{isThrottled && throttleInfo && (
				<Alert
					variant="destructive"
					className="border-orange-600 bg-orange-50 dark:bg-orange-950"
				>
					<AlertCircle className="h-4 w-4 text-orange-600" />
					<AlertDescription className="text-orange-900 dark:text-orange-100">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
							<div className="space-y-1">
								<p className="font-medium">
									{throttleInfo.error}
								</p>
								{throttleInfo.resetDate && (
									<p className="text-sm flex items-center gap-1 text-orange-700 dark:text-orange-200">
										<Calendar className="h-3 w-3" />
										Next audit available:{" "}
										{format(
											new Date(throttleInfo.resetDate),
											"MMM d, yyyy"
										)}
									</p>
								)}
							</div>
							<Button
								size="sm"
								variant="outline"
								className="border-orange-600 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 w-full md:w-auto"
								onClick={onUpgrade}
							>
								<Crown className="mr-2 h-4 w-4" />
								Upgrade to Pro
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			)}

			<Card className="p-8 md:p-12 text-center">
				<div className="max-w-md mx-auto space-y-4">
					<div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center text-3xl">
						📊
					</div>
					<h2 className="text-lg md:text-xl font-semibold">
						No Audit Data Available
					</h2>
					<p className="text-sm md:text-base text-muted-foreground">
						Run your first audit to start tracking your workspace
						hygiene and get actionable recommendations.
					</p>
					{isThrottled ? (
						<div className="space-y-3 mt-4">
							<p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
								Free tier audit limit reached
							</p>
							<Button onClick={onUpgrade} size="lg">
								<Crown className="mr-2 h-4 w-4" />
								Upgrade for Unlimited Audits
							</Button>
						</div>
					) : (
						<Button
							onClick={onRunAudit}
							disabled={isRefreshing}
							size="lg"
							className="mt-4"
						>
							{isRefreshing ? (
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
			</Card>
		</div>
	);
}
