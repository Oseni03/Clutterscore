"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface UndoButtonProps {
	logId: string;
	canUndo: boolean;
	daysUntilExpiry: number | null;
	actionType: string;
	target: string;
	onUndoComplete?: () => void;
}

export function UndoButton({
	logId,
	canUndo,
	daysUntilExpiry,
	actionType,
	target,
	onUndoComplete,
}: UndoButtonProps) {
	const [isUndoing, setIsUndoing] = useState(false);

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
		return (
			<Badge variant="secondary" className="text-xs">
				<Clock className="h-3 w-3 mr-1" />
				Expired
			</Badge>
		);
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={isUndoing}
					className="h-8 text-xs"
				>
					{isUndoing ? (
						<Loader2 className="h-3 w-3 mr-1 animate-spin" />
					) : (
						<Undo2 className="h-3 w-3 mr-1" />
					)}
					Undo
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Undo Action?</AlertDialogTitle>
					<AlertDialogDescription className="space-y-2">
						<p>You are about to undo the following action:</p>
						<div className="bg-muted p-3 rounded-lg space-y-1">
							<p className="font-medium text-foreground">
								{actionType.replace(/_/g, " ")}
							</p>
							<p className="text-sm text-muted-foreground">
								Target: {target}
							</p>
							{daysUntilExpiry !== null && (
								<p className="text-xs text-orange-600 flex items-center gap-1 mt-2">
									<Clock className="h-3 w-3" />
									Expires in {daysUntilExpiry} day
									{daysUntilExpiry !== 1 ? "s" : ""}
								</p>
							)}
						</div>
						<p className="text-sm">
							This will restore the item to its previous state.
							This action cannot be reversed.
						</p>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleUndo}
						disabled={isUndoing}
					>
						{isUndoing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Undoing...
							</>
						) : (
							<>
								<Undo2 className="mr-2 h-4 w-4" />
								Confirm Undo
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
