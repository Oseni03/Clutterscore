"use client";

import React from "react";
import { Loader2 } from "lucide-react";
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
import { UpdateOrganizationForm } from "../forms/update-organization-form";
import { Organization } from "@prisma/client";

interface OrganizationDialogsProps {
	organization: Organization;
	updateDialogOpen: boolean;
	resetDialogOpen: boolean;
	deleteDialogOpen: boolean;
	isLoading: boolean;
	onUpdateDialogChange: (open: boolean) => void;
	onResetDialogChange: (open: boolean) => void;
	onDeleteDialogChange: (open: boolean) => void;
	onResetConfirm: () => void;
	onDeleteConfirm: () => void;
}

export function OrganizationDialogs({
	organization,
	updateDialogOpen,
	resetDialogOpen,
	deleteDialogOpen,
	isLoading,
	onUpdateDialogChange,
	onResetDialogChange,
	onDeleteDialogChange,
	onResetConfirm,
	onDeleteConfirm,
}: OrganizationDialogsProps) {
	return (
		<>
			{/* Update Dialog */}
			<Dialog open={updateDialogOpen} onOpenChange={onUpdateDialogChange}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>Update Workspace</DialogTitle>
						<DialogDescription>
							Make changes to your workspace information here.
							Click save when you&rsquo;re done.
						</DialogDescription>
					</DialogHeader>
					<UpdateOrganizationForm organization={organization} />
				</DialogContent>
			</Dialog>

			{/* Reset Data Alert Dialog */}
			<AlertDialog
				open={resetDialogOpen}
				onOpenChange={onResetDialogChange}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Reset All Organization Data?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete{" "}
							<strong>all data</strong> for{" "}
							<strong>{organization.name}</strong>:
							<br />
							<br />
							• Audit results & trends
							<br />
							• Playbooks & execution history
							<br />
							• Files, integrations, and settings
							<br />
							<br />
							Your organization will remain, but all progress will
							be lost. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={onResetConfirm}
							disabled={isLoading}
							className="bg-destructive hover:bg-destructive/90"
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Resetting...
								</>
							) : (
								"Yes, Reset Everything"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Alert Dialog */}
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={onDeleteDialogChange}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Are you absolutely sure?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently
							delete the workspace{" "}
							<strong className="text-foreground">
								{organization.name}
							</strong>{" "}
							and remove all associated data from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isLoading}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={onDeleteConfirm}
							disabled={isLoading}
							className="bg-destructive hover:bg-destructive/90"
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete Workspace"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
