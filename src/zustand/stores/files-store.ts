import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FileData } from "@/types/audit";
import { ToolSource, FileType } from "@prisma/client";

export interface FilesState {
	files: FileData[];
	filters: {
		source: ToolSource | "all";
		type: FileType | "all";
		isDuplicate: boolean | null;
		isPubliclyShared: boolean | null;
		search: string;
	};
	pagination: {
		page: number;
		limit: number;
		total: number;
	};

	// Actions
	setFiles: (files: FileData[]) => void;
	setFilters: (filters: Partial<FilesState["filters"]>) => void;
	setPagination: (pagination: Partial<FilesState["pagination"]>) => void;
	reset: () => void;
}

export const createFilesStore = () => {
	return create<FilesState>()(
		persist(
			(set) => ({
				files: [],
				filters: {
					source: "all",
					type: "all",
					isDuplicate: null,
					isPubliclyShared: null,
					search: "",
				},
				pagination: {
					page: 1,
					limit: 50,
					total: 0,
				},

				setFiles: (files) => set({ files }),
				setFilters: (newFilters) =>
					set((state) => ({
						filters: { ...state.filters, ...newFilters },
						pagination: { ...state.pagination, page: 1 }, // Reset to first page on filter
					})),
				setPagination: (newPagination) =>
					set((state) => ({
						pagination: { ...state.pagination, ...newPagination },
					})),
				reset: () =>
					set({
						files: [],
						filters: {
							source: "all",
							type: "all",
							isDuplicate: null,
							isPubliclyShared: null,
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
				name: "files-store",
				partialize: (state) => ({
					filters: state.filters,
					pagination: { limit: state.pagination.limit },
				}),
			}
		)
	);
};
