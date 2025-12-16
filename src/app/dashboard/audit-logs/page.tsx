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
	Search,
	ShieldAlert,
	Trash2,
	UserX,
	Download,
	AlertCircle,
	Loader2,
	RefreshCw,
	Archive,
	Key,
	FileText,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import { AuditLogActionType, AuditLogStatus } from "@prisma/client";
import { UndoButton } from "@/components/audit-logs/undo-button";

const ACTION_ICONS = {
	REVOKE_ACCESS: UserX,
	ARCHIVE_FILE: Trash2,
	ARCHIVE_CHANNEL: Archive,
	ARCHIVE_PAGE: Archive,
	REMOVE_GUEST: UserX,
	REMOVE_LICENSE: Key,
	UPDATE_PERMISSIONS: ShieldAlert,
	OTHER: FileText,
};

const ACTION_COLORS = {
	REVOKE_ACCESS: "bg-orange-100 text-orange-600 dark:bg-orange-900/30",
	ARCHIVE_FILE: "bg-red-100 text-red-600 dark:bg-red-900/30",
	ARCHIVE_CHANNEL: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
	ARCHIVE_PAGE: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
	REMOVE_GUEST: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30",
	REMOVE_LICENSE: "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
	UPDATE_PERMISSIONS: "bg-green-100 text-green-600 dark:bg-green-900/30",
	OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-900/30",
};

export default function AuditLogsPage() {
	const {
		logs,
		filters,
		pagination,
		isLoading,
		error,
		setFilters,
		setPagination,
		exportLogs,
		refresh,
		getActionStats,
	} = useAuditLogs();

	const [isExporting, setIsExporting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleSearch = (value: string) => {
		setFilters({ search: value });
	};

	const handlePageChange = (newPage: number) => {
		setPagination({ page: newPage });
	};

	const handleExport = async () => {
		setIsExporting(true);
		try {
			await exportLogs();
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

	const formatActionType = (actionType: AuditLogActionType) => {
		return actionType
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/\b\w/g, (l) => l.toUpperCase());
	};

	const formatTimestamp = (timestamp: Date) => {
		const now = new Date();
		const diff = now.getTime() - new Date(timestamp).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return "Just now";
		if (minutes < 60)
			return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
		if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
		return `${days} day${days === 1 ? "" : "s"} ago`;
	};

	const getActionIcon = (actionType: AuditLogActionType) => {
		const Icon = ACTION_ICONS[actionType] || FileText;
		return Icon;
	};

	const getActionColor = (actionType: AuditLogActionType) => {
		return ACTION_COLORS[actionType] || ACTION_COLORS.OTHER;
	};

	const stats = getActionStats();
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
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} className="h-24" />
					))}
				</div>
				<Card>
					<CardHeader>
						<Skeleton className="h-10 w-full" />
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-16 w-full" />
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
						Audit Logs & Undo History
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Track actions with 30-day undo safety net
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
						Total Actions
					</p>
					<p className="text-2xl font-bold">{pagination.total}</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Successful
					</p>
					<p className="text-2xl font-bold text-green-600">
						{stats.success}
					</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">Failed</p>
					<p className="text-2xl font-bold text-red-600">
						{stats.failed}
					</p>
				</Card>
				<Card className="p-4">
					<p className="text-xs text-muted-foreground mb-1">
						Can Undo
					</p>
					<p className="text-2xl font-bold text-blue-600">
						{logs.filter((l) => l.canUndo).length}
					</p>
				</Card>
			</div>

			{/* Main Card */}
			<Card>
				<CardHeader className="pb-3">
					<div className="flex flex-col md:flex-row gap-4 justify-between">
						<div className="relative flex-1 md:max-w-sm">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search logs..."
								className="pl-9"
								value={filters.search}
								onChange={(e) => handleSearch(e.target.value)}
							/>
						</div>
						<div className="flex gap-2 flex-wrap">
							<Select
								value={filters.actionType}
								onValueChange={(value) =>
									setFilters({
										actionType: value as
											| AuditLogActionType
											| "all",
									})
								}
							>
								<SelectTrigger className="w-[160px]">
									<SelectValue placeholder="Action Type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Actions
									</SelectItem>
									{Object.keys(ACTION_ICONS).map((type) => (
										<SelectItem key={type} value={type}>
											{formatActionType(
												type as AuditLogActionType
											)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={filters.status}
								onValueChange={(value) =>
									setFilters({
										status: value as AuditLogStatus | "all",
									})
								}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">
										All Status
									</SelectItem>
									<SelectItem value="SUCCESS">
										Success
									</SelectItem>
									<SelectItem value="FAILED">
										Failed
									</SelectItem>
									<SelectItem value="PENDING">
										Pending
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>

				<CardContent>
					{logs.length > 0 ? (
						<>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Action</TableHead>
											<TableHead>Target</TableHead>
											<TableHead>Executor</TableHead>
											<TableHead>Time</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">
												Undo
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{logs.map((log) => {
											const Icon = getActionIcon(
												log.actionType
											);
											return (
												<TableRow key={log.id}>
													<TableCell>
														<div className="flex items-center gap-2">
															<div
																className={cn(
																	"h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
																	getActionColor(
																		log.actionType
																	)
																)}
															>
																<Icon className="h-4 w-4" />
															</div>
															<span className="font-medium text-sm">
																{formatActionType(
																	log.actionType
																)}
															</span>
														</div>
													</TableCell>
													<TableCell>
														<div>
															<div className="font-medium text-sm max-w-[200px] truncate">
																{log.target}
															</div>
															<div className="text-xs text-muted-foreground">
																{log.targetType}
															</div>
														</div>
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{log.executor}
													</TableCell>
													<TableCell className="text-sm text-muted-foreground">
														{formatTimestamp(
															log.timestamp
														)}
													</TableCell>
													<TableCell>
														<Badge
															variant={
																log.status ===
																"SUCCESS"
																	? "outline"
																	: log.status ===
																		  "FAILED"
																		? "destructive"
																		: "secondary"
															}
															className={
																log.status ===
																"SUCCESS"
																	? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30"
																	: ""
															}
														>
															{log.status}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<UndoButton
															logId={log.id}
															canUndo={
																log.canUndo
															}
															daysUntilExpiry={
																log.daysUntilExpiry
															}
															actionType={formatActionType(
																log.actionType
															)}
															target={log.target}
															onUndoComplete={
																handleRefresh
															}
														/>
													</TableCell>
												</TableRow>
											);
										})}
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
									of {pagination.total} logs
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
							<ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<h3 className="text-lg font-medium mb-2">
								No audit logs found
							</h3>
							<p className="text-sm">
								{filters.search ||
								filters.actionType !== "all" ||
								filters.status !== "all"
									? "Try adjusting your filters"
									: "Actions will appear here once playbooks are executed"}
							</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
