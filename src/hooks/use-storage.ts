"use client";

import { useState, useEffect, useCallback } from "react";
import { useStorageStore } from "@/zustand/providers/storage-store-provider";
import { FileData } from "@/types/audit";
import { toast } from "sonner";

interface StorageAnalytics {
	stats: {
		totalUsedGb: number;
		totalQuotaGb: number;
		wastedStorageGb: number;
		estimatedMonthlyCost: number;
		duplicateCount: number;
		publicCount: number;
		largestWaster: {
			type: string;
			sizeGb: number;
			source: string | null;
		};
	};
	distribution: {
		name: string;
		value: number;
		sizeGb: number;
	}[];
	largeFiles: FileData[];
}

export function useStorage() {
	const stats = useStorageStore((state) => state.stats);
	const distribution = useStorageStore((state) => state.distribution);
	const lastUpdated = useStorageStore((state) => state.lastUpdated);

	const setStats = useStorageStore((state) => state.setStats);
	const setDistribution = useStorageStore((state) => state.setDistribution);
	const setLastUpdated = useStorageStore((state) => state.setLastUpdated);

	const [largeFiles, setLargeFiles] = useState<FileData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStorageAnalytics =
		useCallback(async (): Promise<StorageAnalytics> => {
			const response = await fetch("/api/storage/analytics");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(
					data.error || "Failed to fetch storage analytics"
				);
			}

			return data;
		}, []);

	const loadStorageData = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const analytics = await fetchStorageAnalytics();

			setStats(analytics.stats);
			setDistribution(analytics.distribution);
			setLargeFiles(analytics.largeFiles);
			setLastUpdated(new Date());
		} catch (err) {
			const errorMsg =
				(err as Error).message || "Failed to load storage data";
			setError(errorMsg);
			setStats(null);
			setDistribution([]);
			setLargeFiles([]);
			setLastUpdated(null);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	}, [fetchStorageAnalytics, setStats, setDistribution, setLastUpdated]);

	const exportReport = useCallback(async () => {
		try {
			const response = await fetch("/api/storage/export");

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				throw new Error(data?.error || "Failed to export storage report");
			}

			const blob = await response.blob();

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `storage-report-${new Date().toISOString().split("T")[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Storage report exported successfully");
		} catch (err) {
			toast.error(
				(err as Error).message || "Failed to export storage report"
			);
			throw err;
		}
	}, []);

	const formatSize = useCallback((sizeGb: number) => {
		if (sizeGb >= 1024) {
			return `${(sizeGb / 1024).toFixed(1)} TB`;
		}
		return `${sizeGb.toFixed(1)} GB`;
	}, []);

	const getUsagePercentage = useCallback(() => {
		if (!stats || stats.totalQuotaGb <= 0) return 0;
		return Math.min(
			100,
			Math.round((stats.totalUsedGb / stats.totalQuotaGb) * 100)
		);
	}, [stats]);

	const getWastePercentage = useCallback(() => {
		if (!stats || stats.totalUsedGb <= 0) return 0;
		return Math.round((stats.wastedStorageGb / stats.totalUsedGb) * 100);
	}, [stats]);

	// Fetch storage data on mount
	useEffect(() => {
		loadStorageData();
	}, [loadStorageData]);

	// Auto-refresh every 10 minutes
	useEffect(() => {
		if (!lastUpdated) return;

		const interval = setInterval(() => {
			const now = new Date();
			const diff = now.getTime() - new Date(lastUpdated).getTime();
			const tenMinutes = 10 * 60 * 1000;

			if (diff > tenMinutes) {
				loadStorageData();
			}
		}, 60 * 1000); // Check every minute

		return () => clearInterval(interval);
	}, [lastUpdated, loadStorageData]);

	return {
		// State
		stats,
		distribution,
		largeFiles,
		lastUpdated,
		isLoading,
		error,

		// Actions
		refresh: loadStorageData,
		exportReport,

		// Computed
		formatSize,
		getUsagePercentage,
		getWastePercentage,
	};
}
