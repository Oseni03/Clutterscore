import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuditLogData } from "@/types/audit";
import type { AuditLogStatus } from "@prisma/client";

export type AuditLogCategory = "all" | "archive" | "remove" | "revoke";

export interface AuditLogsState {
	logs: AuditLogData[];
	filters: {
		category: AuditLogCategory;
		status: AuditLogStatus | "all";
		search: string;
	};
	pagination: {
		page: number;
		limit: number;
		total: number;
	};

	// Actions
	setLogs: (logs: AuditLogData[]) => void;
	setFilters: (filters: Partial<AuditLogsState["filters"]>) => void;
	setPagination: (pagination: Partial<AuditLogsState["pagination"]>) => void;
	reset: () => void;
}

const initialFilters: AuditLogsState["filters"] = {
	category: "all",
	status: "all",
	search: "",
};

export const createAuditLogsStore = () => {
	return create<AuditLogsState>()(
		persist(
			(set) => ({
				logs: [],
				filters: initialFilters,
				pagination: {
					page: 1,
					limit: 50,
					total: 0,
				},

				setLogs: (logs) => set({ logs }),
				setFilters: (newFilters) =>
					set((state) => ({
						filters: { ...state.filters, ...newFilters },
						pagination: { ...state.pagination, page: 1 },
					})),
				setPagination: (newPagination) =>
					set((state) => ({
						pagination: { ...state.pagination, ...newPagination },
					})),
				reset: () =>
					set({
						logs: [],
						filters: initialFilters,
						pagination: {
							page: 1,
							limit: 50,
							total: 0,
						},
					}),
			}),
			{
				name: "audit-logs-store",
				version: 2,
				migrate: (persistedState) => {
					const state = persistedState as AuditLogsState;
					return {
						...state,
						filters: initialFilters,
					};
				},
				partialize: (state) => ({
					filters: state.filters,
					pagination: { limit: state.pagination.limit },
				}),
			}
		)
	);
};
