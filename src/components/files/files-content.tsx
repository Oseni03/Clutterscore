"use client";

import { useEffect, useState } from "react";
import { useFiles } from "@/hooks/use-files";
import { FileType, ToolSource } from "@prisma/client";
import { FilesHeader } from "@/components/files/files-header";
import { FilesStats } from "@/components/files/files-stats";
import { FilesFilters } from "@/components/files/files-filters";
import { FilesTable } from "@/components/files/files-table";
import { FilesPagination } from "@/components/files/files-pagination";
import { ArchiveFileDialog } from "@/components/files/archive-file-dialog";
import { FilesSkeleton } from "@/components/files/files-skeleton";
import { formatSize } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google Workspace",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft 365",
	FIGMA: "Figma",
	JIRA: "Jira",
};

export default function FilesContent() {
	const {
		files,
		allFiles,
		filters,
		pagination,
		stats,
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
	const [exportedCount, setExportedCount] = useState<number | null>(null);

	useEffect(() => {
		if (exportedCount === null) return;

		const timeout = window.setTimeout(() => {
			setExportedCount(null);
		}, 5000);

		return () => window.clearTimeout(timeout);
	}, [exportedCount]);

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
		} catch {
			// Error handled by hook
		} finally {
			setIsArchiving(false);
		}
	};

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const count = await exportFiles();
			setExportedCount(count);
		} catch {
			// Error handled by hook
		} finally {
			setIsExporting(false);
		}
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refresh();
			setExportedCount(null);
		} finally {
			setIsRefreshing(false);
		}
	};

	const totalPages = Math.max(
		1,
		Math.ceil(pagination.total / pagination.limit)
	);
	const archivedFile = allFiles.find((file) => file.id === fileToArchive);
	const totalFiles = stats?.totalFiles ?? pagination.total;
	const totalSizeMb = stats?.totalSizeMb ?? getTotalSize();
	const duplicatesCount = stats?.duplicatesCount ?? getDuplicatesCount();
	const publicFilesCount =
		stats?.publicFilesCount ?? getPublicFilesCount();

	if (isLoading && !stats) {
		return <FilesSkeleton />;
	}

	return (
		<div className="space-y-6 p-6 md:p-8">
			<FilesHeader
				isRefreshing={isRefreshing}
				isExporting={isExporting}
				onRefresh={handleRefresh}
				onExport={handleExport}
			/>

			{exportedCount !== null && (
				<div className="flex items-center gap-2 text-[13px] text-muted-foreground">
					<span className="size-2 rounded-full border border-ink bg-lime" />
					Exported {exportedCount.toLocaleString()} files to CSV
				</div>
			)}

			{error && (
				<div className="flex items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			<FilesStats
				totalFiles={totalFiles}
				totalSize={formatSize(totalSizeMb)}
				duplicatesCount={duplicatesCount}
				publicFilesCount={publicFilesCount}
			/>

			<FilesFilters
				search={filters.search}
				source={filters.source}
				type={filters.type}
				isDuplicate={filters.isDuplicate}
				isPubliclyShared={filters.isPubliclyShared}
				onSearchChange={(value) => setFilters({ search: value })}
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
							filters.isPubliclyShared === true ? null : true,
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

			<div className="overflow-hidden rounded-md border border-border bg-background">
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
			</div>

			<ArchiveFileDialog
				open={showArchiveDialog}
				isArchiving={isArchiving}
				fileName={archivedFile?.name}
				fileSource={
					archivedFile
						? SOURCE_LABELS[archivedFile.source] ??
							archivedFile.source
						: undefined
				}
				onOpenChange={setShowArchiveDialog}
				onConfirm={handleArchiveConfirm}
			/>
		</div>
	);
}
