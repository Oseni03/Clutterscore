"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaybooksStore } from "@/zustand/providers/playbooks-store-provider";
import { PlaybookWithItems, PlaybooksListResponse } from "@/types/audit";
import { PlaybookStatus, ImpactType, ToolSource } from "@prisma/client";
import { toast } from "sonner";

export function usePlaybooks() {
	const playbooks = usePlaybooksStore((state) => state.playbooks);
	const selectedPlaybook = usePlaybooksStore(
		(state) => state.selectedPlaybook
	);
	const filters = usePlaybooksStore((state) => state.filters);

	const setPlaybooks = usePlaybooksStore((state) => state.setPlaybooks);
	const setSelectedPlaybook = usePlaybooksStore(
		(state) => state.setSelectedPlaybook
	);
	const setFilters = usePlaybooksStore((state) => state.setFilters);

	const [isLoading, setIsLoading] = useState(true);
	const [isExecuting, setIsExecuting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchPlaybooks = useCallback(
		async (
			status?: PlaybookStatus,
			source?: ToolSource
		): Promise<PlaybookWithItems[]> => {
			const params = new URLSearchParams();
			if (status) params.set("status", status);
			if (source) params.set("source", source);

			const response = await fetch(`/api/playbooks?${params.toString()}`);
			const data: PlaybooksListResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch playbooks");
			}

			return data.playbooks;
		},
		[]
	);

	const loadPlaybooks = useCallback(async () => {
		try {
			setError(null);
			const data = await fetchPlaybooks();
			setPlaybooks(data);
		} catch (err) {
			const errorMsg =
				(err as Error).message || "Failed to load playbooks";
			setError(errorMsg);
			toast.error(errorMsg);
		}
	}, [fetchPlaybooks, setPlaybooks]);

	const approvePlaybook = useCallback(
		async (playbookId: string) => {
			try {
				const response = await fetch(
					`/api/playbooks/${playbookId}/approve`,
					{
						method: "POST",
					}
				);

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to approve playbook");
				}

				toast.success("Playbook approved");
				await loadPlaybooks();
			} catch (err) {
				toast.error(
					(err as Error).message || "Failed to approve playbook"
				);
				throw err;
			}
		},
		[loadPlaybooks]
	);

	const dismissPlaybook = useCallback(
		async (playbookId: string) => {
			try {
				const response = await fetch(
					`/api/playbooks/${playbookId}/dismiss`,
					{
						method: "POST",
					}
				);

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to dismiss playbook");
				}

				toast.success("Playbook dismissed");
				await loadPlaybooks();
			} catch (err) {
				toast.error(
					(err as Error).message || "Failed to dismiss playbook"
				);
				throw err;
			}
		},
		[loadPlaybooks]
	);

	const executePlaybook = useCallback(
		async (playbookId: string) => {
			setIsExecuting(playbookId);
			try {
				const response = await fetch(
					`/api/playbooks/${playbookId}/execute`,
					{
						method: "POST",
					}
				);

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to execute playbook");
				}

				toast.success("Playbook executed successfully");
				await loadPlaybooks();
			} catch (err) {
				toast.error(
					(err as Error).message || "Failed to execute playbook"
				);
				throw err;
			} finally {
				setIsExecuting(null);
			}
		},
		[loadPlaybooks]
	);

	const getFilteredPlaybooks = useCallback(() => {
		return playbooks.filter((playbook) => {
			const matchesSearch =
				filters.search === "" ||
				playbook.title
					.toLowerCase()
					.includes(filters.search.toLowerCase()) ||
				playbook.description
					.toLowerCase()
					.includes(filters.search.toLowerCase());

			const matchesStatus =
				filters.status === "all" || playbook.status === filters.status;

			const matchesImpactType =
				filters.impactType === "all" ||
				playbook.impactType === filters.impactType;

			return matchesSearch && matchesStatus && matchesImpactType;
		});
	}, [playbooks, filters]);

	const getPlaybooksByStatus = useCallback(
		(status: PlaybookStatus) => {
			return playbooks.filter((p) => p.status === status);
		},
		[playbooks]
	);

	const getPlaybooksByImpactType = useCallback(
		(impactType: ImpactType) => {
			return playbooks.filter((p) => p.impactType === impactType);
		},
		[playbooks]
	);

	// Initial load
	useEffect(() => {
		const load = async () => {
			setIsLoading(true);
			try {
				await loadPlaybooks();
			} finally {
				setIsLoading(false);
			}
		};

		load();
	}, [loadPlaybooks]);

	return {
		// State
		playbooks,
		selectedPlaybook,
		filters,
		isLoading,
		isExecuting,
		error,

		// Actions
		setSelectedPlaybook,
		setFilters,
		approvePlaybook,
		dismissPlaybook,
		executePlaybook,
		refresh: loadPlaybooks,

		// Computed
		getFilteredPlaybooks,
		getPlaybooksByStatus,
		getPlaybooksByImpactType,
	};
}
