"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
	const [typedName, setTypedName] = useState("");

	useEffect(() => {
		if (!deleteDialogOpen) setTypedName("");
	}, [deleteDialogOpen]);

	const canDelete = typedName.trim() === organization.name;

	return (
		<>
			<Dialog open={updateDialogOpen} onOpenChange={onUpdateDialogChange}>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Update workspace
						</DialogTitle>
						<DialogDescription className="mt-2 text-sm text-muted-foreground">
							Update your workspace name and target score.
						</DialogDescription>
					</DialogHeader>
					<UpdateOrganizationForm
						organization={organization}
						onSuccess={() => onUpdateDialogChange(false)}
						onCancel={() => onUpdateDialogChange(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={resetDialogOpen} onOpenChange={onResetDialogChange}>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Reset workspace data?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							This clears your audits, files, ClutterScore
							history, playbooks and audit logs. Connected apps
							stay connected.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 flex gap-3 rounded-xl bg-muted px-4 py-3.5 text-[13px]">
						<span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#F4B183]" />
						<p>
							<span className="font-semibold">
								This cannot be undone.
							</span>{" "}
							<span className="text-muted-foreground">
								Audits, files, playbooks and logs will be
								permanently removed.
							</span>
						</p>
					</div>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => onResetDialogChange(false)}
							disabled={isLoading}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							onClick={onResetConfirm}
							disabled={isLoading}
							className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isLoading ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Resetting...
								</>
							) : (
								"Reset data"
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={deleteDialogOpen}
				onOpenChange={onDeleteDialogChange}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-2xl p-7"
				>
					<DialogHeader className="gap-0 text-left">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Delete this workspace?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							This permanently deletes{" "}
							<span className="font-semibold text-foreground">
								{organization.name}
							</span>
							, its members and all of its data. Type the
							workspace name to confirm.
						</DialogDescription>
					</DialogHeader>

					<label htmlFor="workspace-confirm" className="sr-only">
						Type workspace name
					</label>
					<Input
						id="workspace-confirm"
						value={typedName}
						onChange={(event) => setTypedName(event.target.value)}
						placeholder={organization.name}
						className="mt-4 h-12 rounded-xl border-border bg-background px-4 text-[15px]"
					/>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => onDeleteDialogChange(false)}
							disabled={isLoading}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<button
							type="button"
							onClick={onDeleteConfirm}
							disabled={!canDelete || isLoading}
							className={`inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors ${
								canDelete
									? "bg-ink text-paper hover:bg-ink/90"
									: "bg-border text-muted-foreground"
							}`}
						>
							{isLoading && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Delete workspace
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
