"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaybooksStore } from "@/zustand/providers/playbooks-store-provider";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { PlaybookWithItems, PlaybooksListResponse } from "@/types/audit";
import { PlaybookStatus, ImpactType, ToolSource } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { showUpgradeToast } from "@/components/upgrade-toast";
import { useJobPolling } from "./use-job-polling";

export function usePlaybooks() {
	const router = useRouter();
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

	const activeOrganization = useOrganizationStore(
		(state) => state.activeOrganization
	);
	const subscriptionTier = activeOrganization?.subscriptionTier || "free";

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Job polling state
	const [executionJobId, setExecutionJobId] = useState<string | null>(null);
	const [executingPlaybookId, setExecutingPlaybookId] = useState<
		string | null
	>(null);

	// Poll execution job
	const { status: executionStatus } = useJobPolling(executionJobId, {
		onComplete: () => {
			toast.success("Playbook executed successfully!");
			setExecutionJobId(null);
			setExecutingPlaybookId(null);
			loadPlaybooks();
		},
		onError: (error) => {
			toast.error(`Execution failed: ${error}`);
			setExecutionJobId(null);
			setExecutingPlaybookId(null);
			loadPlaybooks();
		},
	});

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
			// 🚨 SUBSCRIPTION CHECK: Free tier cannot approve/execute playbooks
			if (subscriptionTier === "free") {
				showUpgradeToast(
					"Upgrade Required",
					"Playbook execution is only available on Pro and Enterprise plans. Upgrade to unlock one-click cleanup automation with approval workflows.",
					router
				);
				throw new Error("Subscription upgrade required");
			}

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
				const errorMessage =
					(err as Error).message || "Failed to approve playbook";

				if (!errorMessage.includes("Subscription upgrade required")) {
					toast.error(errorMessage);
				}
				throw err;
			}
		},
		[loadPlaybooks, subscriptionTier, router]
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
			// 🚨 SUBSCRIPTION CHECK: Free tier cannot execute playbooks
			if (subscriptionTier === "free") {
				showUpgradeToast(
					"Upgrade Required",
					"Playbook execution is only available on Pro and Enterprise plans. Upgrade to unlock automated cleanups, recurring audits, and undo actions.",
					router
				);
				throw new Error("Subscription upgrade required");
			}

			setExecutingPlaybookId(playbookId);

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

				setExecutionJobId(data.jobId);
				toast.info(
					data.message || "Executing playbook in background..."
				);
			} catch (err) {
				const errorMessage =
					(err as Error).message || "Failed to execute playbook";

				setExecutingPlaybookId(null);

				if (!errorMessage.includes("Subscription upgrade required")) {
					toast.error(errorMessage);
				}
				throw err;
			}
		},
		[subscriptionTier, router]
	);

	const getFilteredPlaybooks = useCallback(() => {
		if (!Array.isArray(playbooks)) {
			return [];
		}

		const searchTerm =
			typeof filters?.search === "string"
				? filters.search.trim().toLowerCase()
				: "";

		return playbooks.filter((playbook) => {
			if (!playbook) return false;

			const title = (playbook.title || "").toLowerCase();
			const description = (playbook.description || "").toLowerCase();
			const matchesSearch =
				searchTerm === "" ||
				title.includes(searchTerm) ||
				description.includes(searchTerm);

			const matchesStatus =
				!filters?.status ||
				filters.status === "all" ||
				playbook.status === filters.status;

			const matchesImpactType =
				!filters?.impactType ||
				filters.impactType === "all" ||
				playbook.impactType === filters.impactType;

			return matchesSearch && matchesStatus && matchesImpactType;
		});
	}, [playbooks, filters]);

	const getPlaybooksByStatus = useCallback(
		(status: PlaybookStatus) => {
			if (!Array.isArray(playbooks)) return [];
			return playbooks.filter((p) => p && p.status === status);
		},
		[playbooks]
	);

	const getPlaybooksByImpactType = useCallback(
		(impactType: ImpactType) => {
			if (!Array.isArray(playbooks)) return [];
			return playbooks.filter((p) => p && p.impactType === impactType);
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
		playbooks: Array.isArray(playbooks) ? playbooks : [],
		selectedPlaybook,
		filters: filters || { search: "", status: "all", impactType: "all" },
		isLoading,
		isExecuting: executingPlaybookId,
		executionStatus,
		error,
		subscriptionTier,

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
