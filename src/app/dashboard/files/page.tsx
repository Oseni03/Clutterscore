"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
	Search,
	Filter,
	FileText,
	MoreHorizontal,
	Trash2,
	Download,
	ChevronLeft,
	ChevronRight,
	AlertCircle,
	Loader2,
	RefreshCw,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFiles } from "@/hooks/use-files";
import { FileType, ToolSource } from "@prisma/client";
import Image from "next/image";
import { FILE_TYPE_ICONS, SOURCE_ICONS } from "@/lib/utils";

export default function FilesPage() {
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

	const handleSearch = (value: string) => {
		setFilters({ search: value });
	};

	const handlePageChange = (newPage: number) => {
		setPagination({ page: newPage });
	};

	const handleArchive = async () => {
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

	const formatSize = (sizeMb: number) => {
		if (sizeMb >= 1024) {
			return `${(sizeMb / 1024).toFixed(2)} GB`;
		}
		return `${sizeMb.toFixed(2)} MB`;
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "Never";
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const months = Math.floor(days / 30);

		if (months > 0)
			return `${months} ${months === 1 ? "month" : "months"} ago`;
		if (days > 0) return `${days} ${days === 1 ? "day" : "days"} ago`;
		return "Today";
	};

	const getFileIcon = (type: FileType) => {
		const Icon = FILE_TYPE_ICONS[type] || FileText;
		const colors = {
			DOCUMENT: "text-gray-500",
			IMAGE: "text-purple-500",
			VIDEO: "text-blue-500",
			MUSIC: "text-pink-500",
			ARCHIVE: "text-yellow-500",
			DATABASE: "text-green-500",
			OTHER: "text-gray-400",
		};
		return <Icon className={`h-4 w-4 ${colors[type]}`} />;
	};

	const totalPages = Math.ceil(pagination.total / pagination.limit);
	const startIndex = (pagination.page - 1) * pagination.limit;

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
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-xl md:text-2xl font-display font-bold">
						File Explorer
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage large and unused files across all connected apps.
					</p>
				</div>
				<div className="flex gap-2 w-full md:w-auto">
					<Button
						variant="outline"
						onClick={handleRefresh}
						disabled={isRefreshing}
						size="sm"
					>
						{isRefreshing ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 h-4 w-4" />
						)}
						Refresh
					</Button>
					<Button
						variant="outline"
						onClick={handleExport}
						disabled={isExporting}
						size="sm"
					>
						{isExporting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Download className="mr-2 h-4 w-4" />
						)}
						Export
					</Button>
				</div>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Total Files
					</p>
					<p className="text-2xl font-bold">{pagination.total}</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Total Size
					</p>
					<p className="text-2xl font-bold">
						{formatSize(getTotalSize())}
					</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Duplicates
					</p>
					<p className="text-2xl font-bold text-yellow-600">
						{getDuplicatesCount()}
					</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Public Files
					</p>
					<p className="text-2xl font-bold text-red-600">
						{getPublicFilesCount()}
					</p>
				</Card>
			</div>

			{/* Main Card */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col md:flex-row gap-4 justify-between">
						{/* Search */}
						<div className="relative flex-1 md:max-w-sm">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search files..."
								className="pl-9"
								value={filters.search}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>

						{/* Filters */}
						<div className="flex gap-2 flex-wrap">
							{/* Source Filter */}
							<Select
								value={filters.source}
								onValueChange={(value) =>
									setFilters({
										source: value as ToolSource | "all",
									})
								}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Source" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Sources
									</SelectItem>
									{Object.keys(SOURCE_ICONS).map((source) => (
										<SelectItem key={source} value={source}>
											<Image
												src={
													SOURCE_ICONS[
														source as ToolSource
													]
												}
												alt={`${source} icon`}
												width={20}
												height={20}
											/>
											{source}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{/* Type Filter */}
							<Select
								value={filters.type}
								onValueChange={(value) =>
									setFilters({
										type: value as FileType | "all",
									})
								}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Types
									</SelectItem>
									{Object.keys(FILE_TYPE_ICONS).map(
										(type) => (
											<SelectItem key={type} value={type}>
												{type}
											</SelectItem>
										)
									)}
								</SelectContent>
							</Select>

							{/* Special Filters */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="icon">
										<Filter className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() =>
											setFilters({
												isDuplicate:
													filters.isDuplicate === true
														? null
														: true,
											})
										}
									>
										{filters.isDuplicate === true && "✓ "}
										Duplicates Only
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											setFilters({
												isPubliclyShared:
													filters.isPubliclyShared ===
													true
														? null
														: true,
											})
										}
									>
										{filters.isPubliclyShared === true &&
											"✓ "}
										Public Files Only
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() =>
											setFilters({
												source: "all",
												type: "all",
												isDuplicate: null,
												isPubliclyShared: null,
												search: "",
											})
										}
									>
										Clear All Filters
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					{files.length > 0 ? (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Size</TableHead>
											<TableHead>Source</TableHead>
											<TableHead>Last Accessed</TableHead>
											<TableHead>Owner</TableHead>
											<TableHead className="text-right">
												Actions
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{files.map((file) => (
											<TableRow key={file.id}>
												<TableCell>
													<div className="flex items-center gap-3">
														<div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
															{getFileIcon(
																file.type
															)}
														</div>
														<div className="min-w-0">
															<div
																className="font-medium truncate max-w-[200px]"
																title={
																	file.name
																}
															>
																{file.name}
															</div>
															<div className="flex gap-1 mt-1">
																{file.isDuplicate && (
																	<Badge
																		variant="secondary"
																		className="text-[10px] bg-yellow-100 text-yellow-700"
																	>
																		Duplicate
																	</Badge>
																)}
																{file.isPubliclyShared && (
																	<Badge
																		variant="secondary"
																		className="text-[10px] bg-red-100 text-red-700"
																	>
																		Public
																	</Badge>
																)}
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<Badge
														variant="secondary"
														className="font-mono text-xs"
													>
														{formatSize(
															file.sizeMb
														)}
													</Badge>
												</TableCell>
												<TableCell>
													<Image
														src={
															SOURCE_ICONS[
																file.source as ToolSource
															]
														}
														alt={`${file.source} icon`}
														width={20}
														height={20}
													/>
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{formatDate(
														file.lastAccessed
													)}
												</TableCell>
												<TableCell className="text-muted-foreground text-sm">
													{file.ownerEmail ||
														"Unknown"}
												</TableCell>
												<TableCell className="text-right">
													<DropdownMenu>
														<DropdownMenuTrigger
															asChild
														>
															<Button
																variant="ghost"
																size="icon"
															>
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{file.url && (
																<DropdownMenuItem
																	asChild
																>
																	<a
																		href={
																			file.url
																		}
																		target="_blank"
																		rel="noopener noreferrer"
																	>
																		<Download className="mr-2 h-4 w-4" />
																		View
																		File
																	</a>
																</DropdownMenuItem>
															)}
															<DropdownMenuItem
																className="text-destructive"
																onClick={() => {
																	setFileToArchive(
																		file.id
																	);
																	setShowArchiveDialog(
																		true
																	);
																}}
															>
																<Trash2 className="mr-2 h-4 w-4" />
																Archive File
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* Pagination */}
							<div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
								<div className="text-sm text-muted-foreground">
									Showing {startIndex + 1}-
									{Math.min(
										startIndex + pagination.limit,
										pagination.total
									)}{" "}
									of {pagination.total} files
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handlePageChange(
												pagination.page - 1
											)
										}
										disabled={pagination.page === 1}
									>
										<ChevronLeft className="h-4 w-4" />
										Previous
									</Button>
									<div className="flex items-center gap-1">
										<span className="text-sm">
											Page {pagination.page} of{" "}
											{totalPages}
										</span>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											handlePageChange(
												pagination.page + 1
											)
										}
										disabled={pagination.page >= totalPages}
									>
										Next
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<h3 className="text-lg font-medium mb-2">
								No files found
							</h3>
							<p className="text-sm">
								{filters.search ||
								filters.source !== "all" ||
								filters.type !== "all"
									? "Try adjusting your filters"
									: "Run an audit to discover files"}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Archive Confirmation Dialog */}
			<AlertDialog
				open={showArchiveDialog}
				onOpenChange={setShowArchiveDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Archive File?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete this file from the
							source system. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleArchive}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={isArchiving}
						>
							{isArchiving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Processing...
								</>
							) : (
								"Archive"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
