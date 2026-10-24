"use client";

import { Button } from "@/components/ui/button";

interface FilesPaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

export function FilesPagination({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
}: FilesPaginationProps) {
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
			<div className="text-[13px] text-muted-foreground">
				Showing {startIndex + 1}–{endIndex} of{" "}
				{totalItems.toLocaleString()} files · Page {currentPage} of{" "}
				{Math.max(totalPages, 1)}
			</div>
			<div className="flex gap-2">
				<Button
					variant="secondary"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="h-9 rounded-full bg-muted px-4 text-xs font-semibold"
				>
					Previous
				</Button>
				<Button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
					className="h-9 rounded-full px-4 text-xs font-semibold"
				>
					Next
				</Button>
			</div>
		</div>
	);
}
