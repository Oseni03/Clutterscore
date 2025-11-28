import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuditLogData } from "@/types/audit";
import { AuditLogActionType, AuditLogStatus } from "@prisma/client";

export interface AuditLogsState {
	logs: AuditLogData[];
	filters: {
		actionType: AuditLogActionType | "all";
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

export const createAuditLogsStore = () => {
	return create<AuditLogsState>()(
		persist(
			(set) => ({
				logs: [],
				filters: {
					actionType: "all",
					status: "all",
					search: "",
				},
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
						filters: {
							actionType: "all",
							status: "all",
							search: "",
						},
						pagination: {
							page: 1,
							limit: 50,
							total: 0,
						},
					}),
			}),
			{
				name: "audit-logs-store",
				partialize: (state) => ({
					filters: state.filters,
					pagination: { limit: state.pagination.limit },
				}),
			}
		)
	);
};
