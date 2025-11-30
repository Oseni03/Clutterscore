"use client";

import React, { useState, useCallback } from "react";
import { Building2, Edit, Loader2, Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { UpdateOrganizationForm } from "../forms/update-organization-form";
import { toast } from "sonner";
import { Card, CardContent } from "../ui/card";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { deleteOrganization } from "@/server/organizations";

// Extracted loading skeleton component
const OrganizationSkeleton = () => (
	<Card>
		<CardContent className="p-6">
			<div className="animate-pulse space-y-2">
				<div className="h-4 bg-gray-200 rounded w-3/4"></div>
				<div className="h-4 bg-gray-200 rounded w-1/2"></div>
				<div className="h-4 bg-gray-200 rounded w-2/3"></div>
			</div>
		</CardContent>
	</Card>
);

// Extracted info field component for reusability
const InfoField = ({ label, value }: { label: string; value: string }) => (
	<div className="space-y-1">
		<label className="text-sm font-medium text-gray-500">{label}</label>
		<div className="text-base sm:text-lg font-medium break-words">
			{value}
		</div>
	</div>
);

const OrganizationCard = () => {
	const { activeOrganization, isAdmin, removeOrganization } =
		useOrganizationStore((state) => state);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Memoized handlers to prevent unnecessary re-renders
	const handleOpenUpdateDialog = useCallback(() => {
		setUpdateDialogOpen(true);
	}, []);

	const handleOpenDeleteDialog = useCallback(() => {
		setDeleteDialogOpen(true);
	}, []);

	const handleDeleteConfirm = useCallback(async () => {
		if (!activeOrganization) return;

		const toastId = toast.loading("Deleting tenant...");
		setIsLoading(true);

		try {
			const { data, success } = await deleteOrganization(
				activeOrganization.id
			);

			if (!success || !data) {
				toast.error("Failed to delete tenant", { id: toastId });
				return;
			}

			removeOrganization(data.id);
			toast.success("Tenant deleted successfully", { id: toastId });
			setDeleteDialogOpen(false);
		} catch (error) {
			console.error("Delete organization error:", error);
			toast.error("Failed to delete tenant", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	}, [activeOrganization, removeOrganization]);

	// Early return for loading state
	if (!activeOrganization) {
		return <OrganizationSkeleton />;
	}

	const formattedDate = format(activeOrganization.createdAt, "MMMM d, yyyy");

	return (
		<div className="space-y-6">
			{/* Organization Card */}
			<Card className="shadow-sm">
				<div className="p-6 border-b">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold flex items-center gap-2">
							<Building2 className="w-6 h-6" />
							Tenant Information
						</h3>
						{isAdmin && (
							<div className="flex items-center gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleOpenUpdateDialog}
									className="h-9 w-9 p-0"
									aria-label="Edit tenant"
								>
									<Edit className="w-5 h-5" />
								</Button>

								<Button
									variant="ghost"
									size="sm"
									className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
									onClick={handleOpenDeleteDialog}
									aria-label="Delete tenant"
								>
									<Trash2 className="w-5 h-5" />
								</Button>
							</div>
						)}
					</div>
				</div>

				<CardContent className="p-4 sm:p-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<InfoField
							label="Name"
							value={activeOrganization.name}
						/>
						<InfoField
							label="Slug"
							value={activeOrganization.slug}
						/>
						<InfoField label="Created" value={formattedDate} />
					</div>
				</CardContent>
			</Card>

			{/* Update Dialog */}
			<Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
				<DialogContent showCloseButton={true}>
					<DialogHeader>
						<DialogTitle>Update Tenant</DialogTitle>
						<DialogDescription>
							Make changes to your tenant information here. Click
							save when you&rsquo;re done.
						</DialogDescription>
					</DialogHeader>
					<UpdateOrganizationForm organization={activeOrganization} />
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Alert Dialog */}
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Are you absolutely sure?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently
							delete the tenant{" "}
							<strong>{activeOrganization.name}</strong> and
							remove all associated data from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							disabled={isLoading}
							className="bg-red-600 hover:bg-red-700"
						>
							{isLoading ? (
								<>
									<Loader2 className="size-4 animate-spin mr-2" />
									Deleting...
								</>
							) : (
								"Delete Tenant"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default OrganizationCard;
