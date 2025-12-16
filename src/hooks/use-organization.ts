"use client";

import { toast } from "sonner";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { deleteOrganization } from "@/server/organizations";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";

export function useOrganization() {
	const router = useRouter();

	const activeOrganization = useOrganizationStore(
		(state) => state.activeOrganization
	);
	const setActiveOrganization = useOrganizationStore(
		(state) => state.setActiveOrganization
	);
	const organizations = useOrganizationStore((state) => state.organizations);
	const isAdmin = useOrganizationStore((state) => state.isAdmin);
	const removeOrganization = useOrganizationStore(
		(state) => state.removeOrganization
	);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const handleOpenUpdateDialog = useCallback(
		() => setUpdateDialogOpen(true),
		[]
	);
	const handleOpenDeleteDialog = useCallback(
		() => setDeleteDialogOpen(true),
		[]
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (!activeOrganization) return;

		const toastId = toast.loading("Deleting workspace...");
		setIsLoading(true);

		try {
			if (organizations.length === 1) {
				toast.info("You can't delete your only workspace!", {
					id: toastId,
				});
				setIsLoading(false);
				return;
			}
			const { success } = await deleteOrganization(activeOrganization.id);

			if (!isMountedRef.current) return;

			if (!success) {
				toast.error("Failed to delete workspace", { id: toastId });
				setIsLoading(false);
				return;
			}

			removeOrganization(activeOrganization.id);
			toast.success("Workspace deleted successfully", { id: toastId });
			setDeleteDialogOpen(false);
			setIsLoading(false);

			if (organizations.length > 0) {
				setActiveOrganization(organizations[0].id);
			} else {
				router.push("/onboarding");
			}
		} catch (error) {
			if (isMountedRef.current) {
				logger.error("Failed to delete workspace", error);
				toast.error("Failed to delete workspace", { id: toastId });
				setIsLoading(false);
			}
		}
	}, [
		activeOrganization,
		organizations,
		removeOrganization,
		router,
		setActiveOrganization,
	]);

	// Updated handleResetData implementation for your component

	const handleResetData = useCallback(async () => {
		if (!activeOrganization) return;

		const toastId = toast.loading("Resetting all data...");
		setIsLoading(true);

		try {
			const response = await fetch("/api/organization/reset", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to reset data");
			}

			const result = await response.json();

			if (!isMountedRef.current) return;

			toast.success(
				result.message || "All data has been reset successfully",
				{
					id: toastId,
				}
			);

			setResetDialogOpen(false);
			setIsLoading(false);

			// Optionally refresh the page or refetch data
			router.refresh(); // or refetch your data here
		} catch (error) {
			if (isMountedRef.current) {
				logger.error("Failed to reset data", error);
				toast.error(
					error instanceof Error
						? error.message
						: "Failed to reset data. Please try again.",
					{ id: toastId }
				);
				setIsLoading(false);
			}
		}
	}, [activeOrganization, isMountedRef]);

	return {
		activeOrganization,
		isAdmin,
		deleteDialogOpen,
		resetDialogOpen,
		updateDialogOpen,
		isLoading,
		setResetDialogOpen,
		setUpdateDialogOpen,
		setDeleteDialogOpen,
		handleDeleteConfirm,
		handleOpenDeleteDialog,
		handleResetData,
		handleOpenUpdateDialog,
	};
}
