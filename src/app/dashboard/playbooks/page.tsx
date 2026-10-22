"use client";

import { useEffect, useState } from "react";
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

	useEffect(() => {
		setFilters({ status: "all" });
	}, [setFilters]);

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

	const handleClearFilters = () => {
		setFilters({ search: "", status: "all", impactType: "all" });
	};

	const filteredPlaybooks = getFilteredPlaybooks();

	const safePlaybooks = Array.isArray(playbooks) ? playbooks : [];
	const pendingItems = safePlaybooks
		.filter((playbook) => playbook.status === "PENDING")
		.reduce((total, playbook) => total + (playbook.itemsCount || 0), 0);
	const estimatedSavings = safePlaybooks.reduce(
		(total, playbook) => total + (playbook.estimatedSavings || 0),
		0
	);

	const stats = {
		total: safePlaybooks.length,
		security: safePlaybooks.filter(
			(playbook) => playbook?.impactType === "SECURITY"
		).length,
		savings: safePlaybooks.filter(
			(playbook) => playbook?.impactType === "SAVINGS"
		).length,
		efficiency: safePlaybooks.filter(
			(playbook) => playbook?.impactType === "EFFICIENCY"
		).length,
		pendingItems,
		estimatedSavings,
	};

	const currentTabValue =
		filters?.impactType === "all" || !filters?.impactType
			? "all"
			: String(filters.impactType).toLowerCase();

	if (isLoading) {
		return <PlaybooksSkeleton />;
	}

	return (
		<div className="space-y-6 p-6 md:p-8">
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
					onUpgrade={() => router.push("/dashboard/settings/billing")}
				/>
			)}

			{error && <ErrorAlert message={error} />}

			{stats.total > 0 ? (
				<>
					<SummaryStats stats={stats} />

					<PlaybooksFilters
						currentValue={currentTabValue}
						onTabChange={handleTabChange}
						searchValue={filters?.search || ""}
						onSearchChange={handleSearchChange}
						stats={stats}
					/>

					{filteredPlaybooks.length > 0 ? (
						<PlaybooksGrid
							playbooks={filteredPlaybooks}
							onPlaybookClick={(id) =>
								router.push(`/dashboard/playbooks/${id}`)
							}
						/>
					) : (
						<NoFilteredMessage onClear={handleClearFilters} />
					)}
				</>
			) : (
				<NoPlaybooksMessage
					onRunAudit={handleRunAudit}
					isAuditRunning={isAuditRunning}
					isThrottled={isThrottled}
					onUpgrade={() => router.push("/dashboard/settings/billing")}
				/>
			)}
		</div>
	);
}
