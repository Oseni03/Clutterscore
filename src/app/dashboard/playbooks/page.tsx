"use client";

import { useState } from "react";
import { usePlaybooks } from "@/hooks/use-playbooks";
import { useAudit } from "@/hooks/use-audit";
import { useRouter } from "next/navigation";
import { ImpactType } from "@prisma/client";
import PlaybooksHeader from "@/components/playbooks/playbooks-header";
import ThrottleAlert from "@/components/playbooks/throttle-alert";
import ErrorAlert from "@/components/playbooks/error-alert";
import PlaybooksFilters from "@/components/playbooks/playbooks-filters";
import PlaybooksGrid from "@/components/playbooks/playbooks-grid";
import SummaryStats from "@/components/playbooks/summary-stats";
import NoPlaybooksMessage from "@/components/playbooks/no-playbooks-message";
import NoFilteredMessage from "@/components/playbooks/no-filtered-message";
import PlaybooksSkeleton from "@/components/playbooks/playbooks-skeleton";

export default function PlaybooksPage() {
	const router = useRouter();
	const {
		runAudit,
		isRunning: isAuditRunning,
		isThrottled,
		throttleInfo,
	} = useAudit();
	const {
		playbooks,
		filters,
		isLoading,
		error,
		setFilters,
		getFilteredPlaybooks,
		refresh,
	} = usePlaybooks();

	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleRunAudit = async () => {
		try {
			await runAudit(refresh);
		} catch {
			// Error already handled by hook
		}
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
		} finally {
			setIsRefreshing(false);
		}
	};

	const handleTabChange = (value: string) => {
		setFilters({
			impactType:
				value === "all" ? "all" : (value.toUpperCase() as ImpactType),
		});
	};

	const handleSearchChange = (value: string) => {
		setFilters({ search: value });
	};

	const filteredPlaybooks = getFilteredPlaybooks();

	// Stats with safe array checks
	const stats = {
		total: Array.isArray(playbooks) ? playbooks.length : 0,
		security: Array.isArray(playbooks)
			? playbooks.filter((p) => p?.impactType === "SECURITY").length
			: 0,
		savings: Array.isArray(playbooks)
			? playbooks.filter((p) => p?.impactType === "SAVINGS").length
			: 0,
		efficiency: Array.isArray(playbooks)
			? playbooks.filter((p) => p?.impactType === "EFFICIENCY").length
			: 0,
	};

	// Get current tab value safely
	const currentTabValue =
		filters?.impactType === "all" || !filters?.impactType
			? "all"
			: String(filters.impactType).toLowerCase();

	if (isLoading) {
		return <PlaybooksSkeleton />;
	}

	return (
		<div className="p-4 md:p-6 space-y-6">
			<PlaybooksHeader
				onRunAudit={handleRunAudit}
				onRefresh={handleRefresh}
				isAuditRunning={isAuditRunning}
				isRefreshing={isRefreshing}
				isThrottled={isThrottled}
			/>

			{isThrottled && throttleInfo && (
				<ThrottleAlert
					throttleInfo={throttleInfo}
					onUpgrade={() => router.push("/pricing")}
				/>
			)}

			{error && <ErrorAlert message={error} />}

			<PlaybooksFilters
				currentValue={currentTabValue}
				onTabChange={handleTabChange}
				searchValue={filters?.search || ""}
				onSearchChange={handleSearchChange}
				stats={stats}
			/>

			<PlaybooksGrid
				playbooks={filteredPlaybooks}
				onPlaybookClick={(id) =>
					router.push(`/dashboard/playbooks/${id}`)
				}
			/>

			{stats.total === 0 && (
				<NoPlaybooksMessage
					onRunAudit={handleRunAudit}
					isAuditRunning={isAuditRunning}
					isThrottled={isThrottled}
					onUpgrade={() => router.push("/pricing")}
				/>
			)}

			{stats.total > 0 && filteredPlaybooks.length === 0 && (
				<NoFilteredMessage />
			)}

			{stats.total > 0 && <SummaryStats stats={stats} />}
		</div>
	);
}
