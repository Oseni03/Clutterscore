"use client";

import { useState, useEffect, useCallback } from "react";
import { useDashboardStore } from "@/zustand/providers/dashboard-store-provider";
import {
	DashboardAuditData,
	ScoreTrendData,
	transformAuditData,
	LatestAuditResponse,
	ScoreTrendsResponse,
} from "@/types/audit";
import { toast } from "sonner";
import { useAudit } from "./use-audit";

export function useDashboard() {
	const auditData = useDashboardStore((state) => state.auditData);
	const scoreTrends = useDashboardStore((state) => state.scoreTrends);
	const selectedTrendPeriod = useDashboardStore(
		(state) => state.selectedTrendPeriod
	);
	const lastRefresh = useDashboardStore((state) => state.lastRefresh);

	const setAuditData = useDashboardStore((state) => state.setAuditData);
	const setScoreTrends = useDashboardStore((state) => state.setScoreTrends);
	const setSelectedTrendPeriod = useDashboardStore(
		(state) => state.setSelectedTrendPeriod
	);
	const setLastRefresh = useDashboardStore((state) => state.setLastRefresh);

	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Use audit hook with job polling
	const { runAudit: triggerAudit, isRunning: isAuditRunning } = useAudit();

	const fetchLatestAudit =
		useCallback(async (): Promise<DashboardAuditData> => {
			const response = await fetch("/api/audit/latest");
			const data: LatestAuditResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch audit");
			}

			return transformAuditData(data.auditResult);
		}, []);

	const fetchScoreTrends = useCallback(
		async (months: number = 12): Promise<ScoreTrendData[]> => {
			const response = await fetch(`/api/score-trends?months=${months}`);
			const data: ScoreTrendsResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch trends");
			}

			return data.trends;
		},
		[]
	);

	const loadDashboardData = useCallback(async () => {
		try {
			setError(null);

			const [audit, trends] = await Promise.all([
				fetchLatestAudit(),
				fetchScoreTrends(12),
			]);

			setAuditData(audit);
			setScoreTrends(trends);
			setLastRefresh(new Date());
		} catch (err) {
			const errorMsg =
				(err as Error).message || "Failed to load dashboard data";
			setError(errorMsg);

			if (!(err as Error).message?.includes("No audit results found")) {
				toast.error(errorMsg);
			}
		}
	}, [
		fetchLatestAudit,
		fetchScoreTrends,
		setAuditData,
		setScoreTrends,
		setLastRefresh,
	]);

	const runAudit = useCallback(async () => {
		try {
			await triggerAudit(async () => {
				// Reload dashboard data after audit completes
				await loadDashboardData();
			});
		} catch (err) {
			// Error already handled by useAudit hook
			throw err;
		}
	}, [triggerAudit, loadDashboardData]);

	const refresh = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await loadDashboardData();
		} finally {
			setIsRefreshing(false);
		}
	}, [loadDashboardData]);

	// Initial load
	useEffect(() => {
		const load = async () => {
			setIsLoading(true);
			try {
				await loadDashboardData();
			} finally {
				setIsLoading(false);
			}
		};

		load();
	}, [loadDashboardData]);

	// Auto-refresh every 5 minutes if data is stale
	useEffect(() => {
		if (!lastRefresh) return;

		const interval = setInterval(() => {
			const now = new Date();
			const diff = now.getTime() - new Date(lastRefresh).getTime();
			const fiveMinutes = 5 * 60 * 1000;

			if (diff > fiveMinutes) {
				refresh();
			}
		}, 60 * 1000);

		return () => clearInterval(interval);
	}, [lastRefresh, refresh]);

	const getFilteredTrends = useCallback(() => {
		const monthsToShow = selectedTrendPeriod === "30" ? 3 : 6;
		return scoreTrends.slice(-monthsToShow).map((trend) => ({
			name: new Date(trend.month + "-01").toLocaleDateString("en-US", {
				month: "short",
			}),
			score: trend.score,
			waste: trend.waste,
		}));
	}, [scoreTrends, selectedTrendPeriod]);

	const getPreviousScore = useCallback((): number | null => {
		if (scoreTrends.length < 2) return null;
		return scoreTrends[scoreTrends.length - 2].score;
	}, [scoreTrends]);

	return {
		// State
		auditData,
		scoreTrends,
		selectedTrendPeriod,
		lastRefresh,
		isLoading,
		isRefreshing: isRefreshing || isAuditRunning,
		error,

		// Actions
		runAudit,
		refresh,
		setSelectedTrendPeriod,
		getFilteredTrends,
		getPreviousScore,
	};
}
