import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PlaybookWithItems } from "@/types/audit";
import { PlaybookStatus, ImpactType } from "@prisma/client";
export interface PlaybooksFilters {
	search: string;
	status: PlaybookStatus | "all";
	impactType: ImpactType | "all";
}

export interface PlaybooksState {
	playbooks: PlaybookWithItems[];
	selectedPlaybook: PlaybookWithItems | null;
	filters: PlaybooksFilters;

	// Actions
	setPlaybooks: (playbooks: PlaybookWithItems[]) => void;
	setSelectedPlaybook: (playbook: PlaybookWithItems | null) => void;
	setFilters: (filters: Partial<PlaybooksState["filters"]>) => void;
	resetFilters: () => void;
	reset: () => void;
}

const defaultFilters: PlaybooksFilters = {
	search: "",
	status: "all",
	impactType: "all",
};

export const createPlaybooksStore = () => {
	return create<PlaybooksState>()(
		persist(
			(set) => ({
				playbooks: [],
				selectedPlaybook: null,
				filters: defaultFilters,

				setPlaybooks: (playbooks) => set({ playbooks }),
				setSelectedPlaybook: (selectedPlaybook) =>
					set({ selectedPlaybook }),
				setFilters: (newFilters) =>
					set((state) => ({
						filters: { ...state.filters, ...newFilters },
					})),
				resetFilters: () =>
					set({
						filters: defaultFilters,
					}),
				reset: () =>
					set({
						playbooks: [],
						selectedPlaybook: null,
						filters: {
							status: "all",
							impactType: "all",
							search: "",
						},
					}),
			}),
			{
				name: "playbooks-store",
				partialize: (state) => ({
					filters: state.filters,
				}),
			}
		)
	);
};
