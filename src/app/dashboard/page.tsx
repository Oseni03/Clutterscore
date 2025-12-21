// app/dashboard/page.tsx
"use client";

import { useRouter } from "next/navigation";

import DashboardHeader from "@/components/dashboard/dashboard-header";
import ThrottleAlert from "@/components/dashboard/throttle-alert";
import ErrorAlert from "@/components/dashboard/error-alert";
import DashboardHero from "@/components/dashboard/dashboard-hero";
import ClutterscoreTrend from "@/components/dashboard/clutterscore-trend";
import RecommendedPlaybooks from "@/components/dashboard/recommended-playbooks";
import DashboardEmptyState from "@/components/dashboard/dashboard-empty-state";
import DashboardSkeleton from "@/components/dashboard/dashboard-skeleton";

import { useDashboard } from "@/hooks/use-dashboard";

export default function DashboardPage() {
	const router = useRouter();
	const {
		targetScore,
		auditData,
		isLoading,
		isRefreshing,
		error,
		isThrottled,
		throttleInfo,
		runAudit,
		getPreviousScore,
	} = useDashboard();

	if (isLoading) {
		return <DashboardSkeleton />;
	}

	if (!auditData) {
		return (
			<DashboardEmptyState
				isThrottled={isThrottled}
				throttleInfo={throttleInfo}
				isRefreshing={isRefreshing}
				onRunAudit={runAudit}
				onUpgrade={() => router.push("/pricing")}
			/>
		);
	}

	const previousScore = getPreviousScore();

	return (
		<div className="p-4 md:p-6 space-y-6">
			<DashboardHeader
				auditedAt={auditData.auditedAt}
				isRefreshing={isRefreshing}
				isThrottled={isThrottled}
				onRunAudit={runAudit}
				onViewLogs={() => router.push("/dashboard/audit-logs")}
			/>

			{isThrottled && throttleInfo && (
				<ThrottleAlert
					throttleInfo={throttleInfo}
					onUpgrade={() => router.push("/pricing")}
				/>
			)}

			{error && <ErrorAlert message={error} />}

			<DashboardHero
				score={auditData.score}
				previousScore={previousScore ?? undefined}
				targetScore={targetScore}
				estimatedSavings={auditData.estimatedSavings}
				storageWaste={auditData.storageWaste}
				licenseWaste={auditData.licenseWaste}
				activeRisks={auditData.activeRisks}
				criticalRisks={auditData.criticalRisks}
				moderateRisks={auditData.moderateRisks}
				isThrottled={isThrottled}
				isRefreshing={isRefreshing}
				onRunAudit={runAudit}
			/>

			<ClutterscoreTrend />

			<RecommendedPlaybooks playbooks={auditData.playbooks ?? []} />
		</div>
	);
}
