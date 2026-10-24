"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ArchiveFileDialogProps {
	open: boolean;
	isArchiving: boolean;
	fileName?: string;
	fileSource?: string;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

export function ArchiveFileDialog({
	open,
	isArchiving,
	fileName,
	fileSource,
	onOpenChange,
	onConfirm,
}: ArchiveFileDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-w-[460px] gap-0 rounded-xl border-border p-7"
			>
				<DialogHeader className="gap-0">
					<DialogTitle className="font-display text-[24px] font-semibold tracking-[-0.03em]">
						Archive this file?
					</DialogTitle>
					<DialogDescription className="mt-2.5 text-sm text-muted-foreground">
						<span className="font-semibold text-foreground">
							{fileName || "This file"}
						</span>{" "}
						will be moved to an archive folder in{" "}
						{fileSource || "its source"}. It will no longer appear
						in Files.
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 flex gap-3 rounded-md bg-muted px-4 py-3.5 text-[13px]">
					<span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink" />
					<p>
						You can undo this for 30 days. Find archived files in
						Audit logs.
					</p>
				</div>

				<div className="mt-6 flex flex-wrap justify-end gap-3">
					<Button
						variant="secondary"
						onClick={() => onOpenChange(false)}
						disabled={isArchiving}
						className="h-11 rounded-full px-6 text-sm font-semibold"
					>
						Cancel
					</Button>
					<Button
						onClick={onConfirm}
						disabled={isArchiving}
						className="h-11 rounded-full px-6 text-sm font-semibold"
					>
						{isArchiving ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Archiving...
							</>
						) : (
							"Archive file"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
