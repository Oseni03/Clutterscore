import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PlaybookWithItems } from "@/types/audit";
import { PlaybookStatus, ImpactType } from "@prisma/client";

export interface PlaybooksState {
	playbooks: PlaybookWithItems[];
	selectedPlaybook: PlaybookWithItems | null;
	filters: {
		status: PlaybookStatus | "all";
		impactType: ImpactType | "all";
		search: string;
	};

	// Actions
	setPlaybooks: (playbooks: PlaybookWithItems[]) => void;
	setSelectedPlaybook: (playbook: PlaybookWithItems | null) => void;
	setFilters: (filters: Partial<PlaybooksState["filters"]>) => void;
	reset: () => void;
}

export const createPlaybooksStore = () => {
	return create<PlaybooksState>()(
		persist(
			(set) => ({
				playbooks: [],
				selectedPlaybook: null,
				filters: {
					status: "all",
					impactType: "all",
					search: "",
				},

				setPlaybooks: (playbooks) => set({ playbooks }),
				setSelectedPlaybook: (selectedPlaybook) =>
					set({ selectedPlaybook }),
				setFilters: (newFilters) =>
					set((state) => ({
						filters: { ...state.filters, ...newFilters },
					})),
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
