"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface UndoButtonProps {
	logId: string;
	canUndo: boolean;
	daysUntilExpiry: number | null;
	undoExpiresAt: Date | string | null;
	isUndone: boolean;
	actionType: string;
	target: string;
	onUndoComplete?: () => void;
}

export function UndoButton({
	logId,
	canUndo,
	daysUntilExpiry,
	undoExpiresAt,
	isUndone,
	actionType,
	target,
	onUndoComplete,
}: UndoButtonProps) {
	const [isUndoing, setIsUndoing] = useState(false);
	const [open, setOpen] = useState(false);

	const handleUndo = async () => {
		setIsUndoing(true);
		try {
			const response = await fetch(`/api/audit-logs/${logId}/undo`, {
				method: "POST",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to undo action");
			}

			toast.success("Action undone successfully", {
				description: `Restored: ${target}`,
			});
			setOpen(false);

			if (onUndoComplete) {
				onUndoComplete();
			}
		} catch (error) {
			toast.error("Failed to undo action", {
				description:
					error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsUndoing(false);
		}
	};

	if (!canUndo) {
		const expired =
			!!undoExpiresAt &&
			new Date(undoExpiresAt).getTime() <= new Date().getTime();
		const label = isUndone ? "Undone" : expired ? "Expired" : "Unavailable";

		return (
			<button
				type="button"
				disabled
				className="inline-flex h-9 cursor-not-allowed items-center rounded-full bg-muted px-4 text-xs font-semibold text-muted-foreground opacity-70"
			>
				{label}
			</button>
		);
	}

	return (
		<>
			<Button
				onClick={() => setOpen(true)}
				className="h-9 rounded-full bg-ink px-4 text-xs font-semibold text-paper hover:bg-ink/90"
			>
				Undo
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					className="max-w-[460px] gap-0 rounded-xl border-border p-7"
				>
					<DialogHeader className="gap-0">
						<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
							Undo this action?
						</DialogTitle>
						<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
							<span className="font-semibold text-foreground">
								{actionType}
							</span>{" "}
							on{" "}
							<span className="font-semibold text-foreground">
								{target}
							</span>{" "}
							will be restored to its previous state.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4 flex gap-3 rounded-md bg-muted px-4 py-3.5 text-[13px]">
						<span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink" />
						<p>
							{daysUntilExpiry !== null
								? daysUntilExpiry <= 0
									? "This undo window expires today."
									: `This undo window expires in ${daysUntilExpiry} day${
											daysUntilExpiry === 1 ? "" : "s"
										}.`
								: "This action can only be undone once."}
						</p>
					</div>

					<div className="mt-6 flex flex-wrap justify-end gap-3">
						<Button
							variant="secondary"
							onClick={() => setOpen(false)}
							disabled={isUndoing}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							Cancel
						</Button>
						<Button
							onClick={handleUndo}
							disabled={isUndoing}
							className="h-11 rounded-full px-6 text-sm font-semibold"
						>
							{isUndoing ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Undoing...
								</>
							) : (
								"Confirm undo"
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
