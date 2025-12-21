"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useFiles } from "@/hooks/use-files";
import { FileType, ToolSource } from "@prisma/client";
import { FilesHeader } from "@/components/files/files-header";
import { FilesStats } from "@/components/files/files-stats";
import { FilesFilters } from "@/components/files/files-filters";
import { FilesTable } from "@/components/files/files-table";
import { FilesPagination } from "@/components/files/files-pagination";
import { ArchiveFileDialog } from "@/components/files/archive-file-dialog";
import { formatSize } from "@/lib/utils";

export default function FilesContent() {
	const {
		files,
		filters,
		pagination,
		isLoading,
		error,
		setFilters,
		setPagination,
		archiveFile,
		exportFiles,
		refresh,
		getTotalSize,
		getDuplicatesCount,
		getPublicFilesCount,
	} = useFiles();

	const [showArchiveDialog, setShowArchiveDialog] = useState(false);
	const [fileToArchive, setFileToArchive] = useState<string | null>(null);
	const [isArchiving, setIsArchiving] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleArchiveClick = (fileId: string) => {
		setFileToArchive(fileId);
		setShowArchiveDialog(true);
	};

	const handleArchiveConfirm = async () => {
		if (!fileToArchive) return;

		setIsArchiving(true);
		try {
			await archiveFile(fileToArchive);
			setShowArchiveDialog(false);
			setFileToArchive(null);
		} finally {
			setIsArchiving(false);
		}
	};

	const handleExport = async () => {
		setIsExporting(true);
		try {
			await exportFiles();
		} finally {
			setIsExporting(false);
		}
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
		} finally {
			setIsRefreshing(false);
		}
	};

	const totalPages = Math.ceil(pagination.total / pagination.limit);

	if (isLoading) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div className="space-y-2">
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-96" />
					</div>
					<Skeleton className="h-10 w-32" />
				</div>

				<Card>
					<CardHeader>
						<Skeleton className="h-10 w-full" />
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-4 md:p-6 space-y-6">
			<FilesHeader
				isRefreshing={isRefreshing}
				isExporting={isExporting}
				onRefresh={handleRefresh}
				onExport={handleExport}
			/>

			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<FilesStats
				totalFiles={pagination.total}
				totalSize={formatSize(getTotalSize())}
				duplicatesCount={getDuplicatesCount()}
				publicFilesCount={getPublicFilesCount()}
			/>

			<Card>
				<CardHeader className="pb-3">
					<FilesFilters
						search={filters.search}
						source={filters.source}
						type={filters.type}
						isDuplicate={filters.isDuplicate}
						isPubliclyShared={filters.isPubliclyShared}
						onSearchChange={(value) =>
							setFilters({ search: value })
						}
						onSourceChange={(value) =>
							setFilters({
								source: value as ToolSource | "all",
							})
						}
						onTypeChange={(value) =>
							setFilters({ type: value as FileType | "all" })
						}
						onToggleDuplicate={() =>
							setFilters({
								isDuplicate:
									filters.isDuplicate === true ? null : true,
							})
						}
						onTogglePublic={() =>
							setFilters({
								isPubliclyShared:
									filters.isPubliclyShared === true
										? null
										: true,
							})
						}
						onClearFilters={() =>
							setFilters({
								source: "all",
								type: "all",
								isDuplicate: null,
								isPubliclyShared: null,
								search: "",
							})
						}
					/>
				</CardHeader>

				<CardContent>
					<FilesTable files={files} onArchive={handleArchiveClick} />

					{files.length > 0 && (
						<FilesPagination
							currentPage={pagination.page}
							totalPages={totalPages}
							totalItems={pagination.total}
							itemsPerPage={pagination.limit}
							onPageChange={(page) => setPagination({ page })}
						/>
					)}
				</CardContent>
			</Card>

			<ArchiveFileDialog
				open={showArchiveDialog}
				isArchiving={isArchiving}
				onOpenChange={setShowArchiveDialog}
				onConfirm={handleArchiveConfirm}
			/>
		</div>
	);
}
