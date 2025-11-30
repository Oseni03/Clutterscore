"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuditLogsStore } from "@/zustand/providers/audit-logs-store-provider";
import { AuditLogsListResponse } from "@/types/audit";
import { AuditLogActionType } from "@prisma/client";
import { toast } from "sonner";

export function useAuditLogs() {
	const logs = useAuditLogsStore((state) => state.logs);
	const filters = useAuditLogsStore((state) => state.filters);
	const pagination = useAuditLogsStore((state) => state.pagination);

	const setLogs = useAuditLogsStore((state) => state.setLogs);
	const setFilters = useAuditLogsStore((state) => state.setFilters);
	const setPagination = useAuditLogsStore((state) => state.setPagination);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchLogs = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const page = pagination.page ?? 1;
			const limit = pagination.limit ?? 20;

			const params = new URLSearchParams({
				page: String(page),
				limit: String(limit),
			});

			if (filters.actionType !== "all") {
				params.set("actionType", filters.actionType);
			}
			if (filters.status !== "all") {
				params.set("status", filters.status);
			}

			const response = await fetch(
				`/api/audit-logs?${params.toString()}`
			);
			const data: AuditLogsListResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch audit logs");
			}

			setLogs(data.logs);
			setPagination({
				total: data.pagination.total,
				page: data.pagination.page,
			});
		} catch (err) {
			const errorMsg =
				(err as Error).message || "Failed to load audit logs";
			setError(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	}, [filters, pagination.page, pagination.limit, setLogs, setPagination]);

	const getFilteredLogs = useCallback(() => {
		if (!filters.search) return logs;

		return logs.filter(
			(log) =>
				log.target
					.toLowerCase()
					.includes(filters.search.toLowerCase()) ||
				log.targetType
					.toLowerCase()
					.includes(filters.search.toLowerCase()) ||
				log.executor
					.toLowerCase()
					.includes(filters.search.toLowerCase())
		);
	}, [logs, filters.search]);

	const exportLogs = useCallback(async () => {
		try {
			const response = await fetch("/api/audit-logs/export");
			const blob = await response.blob();

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Audit logs exported successfully");
		} catch (err) {
			toast.error("Failed to export audit logs");
			throw err;
		}
	}, []);

	const getActionStats = useCallback(() => {
		return {
			total: logs.length,
			success: logs.filter((l) => l.status === "SUCCESS").length,
			failed: logs.filter((l) => l.status === "FAILED").length,
			pending: logs.filter((l) => l.status === "PENDING").length,
		};
	}, [logs]);

	const getActionTypeCount = useCallback(
		(type: AuditLogActionType) => {
			return logs.filter((l) => l.actionType === type).length;
		},
		[logs]
	);

	// Fetch logs on mount and when dependencies change
	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	return {
		// State
		logs: getFilteredLogs(),
		allLogs: logs,
		filters,
		pagination,
		isLoading,
		error,

		// Actions
		setFilters,
		setPagination,
		exportLogs,
		refresh: fetchLogs,

		// Computed
		getActionStats,
		getActionTypeCount,
	};
}
