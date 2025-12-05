"use client";

import { toast } from "sonner";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { deleteOrganization } from "@/server/organizations";
import { useCallback, useEffect, useRef, useState } from "react";

export function useOrganization() {
	const { activeOrganization, organizations, isAdmin, removeOrganization } =
		useOrganizationStore((state) => ({
			activeOrganization: state.activeOrganization,
			isAdmin: state.isAdmin,
			removeOrganization: state.removeOrganization,
			organizations: state.organizations,
		}));

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
				return;
			}
			const { success } = await deleteOrganization(activeOrganization.id);

			if (!isMountedRef.current) return;

			if (!success) {
				toast.error("Failed to delete workspace", { id: toastId });
				return;
			}

			removeOrganization(activeOrganization.id);
			toast.success("Workspace deleted successfully", { id: toastId });
			setDeleteDialogOpen(false);
		} catch (error) {
			if (isMountedRef.current) {
				console.error(error);
				toast.error("Failed to delete workspace", { id: toastId });
			}
		} finally {
			if (isMountedRef.current) setIsLoading(false);
		}
	}, [activeOrganization, removeOrganization, organizations.length]);

	const handleResetData = useCallback(async () => {
		if (!activeOrganization) return;

		const toastId = toast.loading("Resetting all data...");
		setIsLoading(true);

		try {
			// TODO: Implement reset data API call
			// await resetOrganizationData(activeOrganization.id);

			if (!isMountedRef.current) return;

			toast.success("All data has been reset successfully", {
				id: toastId,
			});
			setResetDialogOpen(false);
		} catch (error) {
			if (isMountedRef.current) {
				console.error(error);
				toast.error("Failed to reset data", { id: toastId });
			}
		} finally {
			if (isMountedRef.current) setIsLoading(false);
		}
	}, [activeOrganization]);

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
