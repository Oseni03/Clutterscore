"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Archive,
	FileText,
	ShieldCheck,
	Trash2,
	Loader2,
	Search,
} from "lucide-react";
import type { AuditLogActionType, AuditLogStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { UndoButton } from "@/components/audit-logs/undo-button";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import type { AuditLogCategory } from "@/zustand/stores/audit-logs-store";
import type { AuditLogData } from "@/types/audit";

const CATEGORY_TABS: { value: AuditLogCategory; label: string }[] = [
	{ value: "all", label: "All actions" },
	{ value: "archive", label: "Archive" },
	{ value: "remove", label: "Remove" },
	{ value: "revoke", label: "Revoke" },
];

const STATUS_TABS: {
	value: AuditLogStatus | "all";
	label: string;
}[] = [
	{ value: "all", label: "All" },
	{ value: "SUCCESS", label: "Success" },
	{ value: "FAILED", label: "Failed" },
];

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google Workspace",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft 365",
	FIGMA: "Figma",
	JIRA: "Jira",
};

function getCategory(actionType: AuditLogActionType) {
	switch (actionType) {
		case "ARCHIVE_FILE":
		case "ARCHIVE_CHANNEL":
		case "ARCHIVE_PAGE":
			return "archive";
		case "REMOVE_GUEST":
		case "REMOVE_LICENSE":
			return "remove";
		case "REVOKE_ACCESS":
		case "UPDATE_PERMISSIONS":
			return "revoke";
		default:
			return "other";
	}
}

function getActionMeta(actionType: AuditLogActionType) {
	const category = getCategory(actionType);

	if (category === "archive") {
		return {
			label: "Archive",
			icon: Archive,
			iconClass: "bg-lime text-ink",
		};
	}
	if (category === "remove") {
		return {
			label: "Remove",
			icon: Trash2,
			iconClass: "bg-[#F4B183] text-ink",
		};
	}
	if (category === "revoke") {
		return {
			label: "Revoke",
			icon: ShieldCheck,
			iconClass: "bg-[#B9A9D6] text-ink",
		};
	}

	return {
		label: "Other",
		icon: FileText,
		iconClass: "bg-muted text-foreground",
	};
}

function relativeTime(value: Date | string) {
	const diff = Date.now() - new Date(value).getTime();
	const minutes = Math.floor(diff / 60000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	if (days < 30) return `${days} days ago`;

	const months = Math.floor(days / 30);
	if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

	const years = Math.floor(days / 365);
	return `${years} year${years === 1 ? "" : "s"} ago`;
}

function isLogUndone(log: AuditLogData) {
	if (log.isUndone) return true;
	const details = (log.details ?? {}) as Record<string, unknown>;
	return details.undone === true;
}

function StatusPill({ log }: { log: AuditLogData }) {
	const undone = isLogUndone(log);

	if (undone) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
				<span className="size-1.5 rounded-full bg-muted-foreground" />
				Undone
			</span>
		);
	}

	if (log.status === "FAILED") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4B183]/40 px-2.5 py-1 text-xs font-medium text-ink">
				<span className="size-1.5 rounded-full bg-[#C67A51]" />
				Failed
			</span>
		);
	}

	if (log.status === "PENDING") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
				<span className="size-1.5 rounded-full bg-muted-foreground" />
				Pending
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium">
			<span className="size-1.5 rounded-full bg-[#8FA9A8]" />
			Success
		</span>
	);
}

export default function AuditLogsPage() {
	const {
		logs,
		filters,
		pagination,
		stats,
		isLoading,
		error,
		setFilters,
		setPagination,
		exportLogs,
		refresh,
	} = useAuditLogs();

	const [isExporting, setIsExporting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!toastMessage) return;

		const timer = setTimeout(() => setToastMessage(null), 5000);
		return () => clearTimeout(timer);
	}, [toastMessage]);

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

	const handleUndoComplete = (target: string) => {
		setToastMessage(`Undone: ${target} was restored.`);
		void handleRefresh();
	};

	const totalActions = stats?.totalActions ?? pagination.total;
	const successful =
		stats?.successful ??
		logs.filter((log) => log.status === "SUCCESS").length;
	const failed =
		stats?.failed ?? logs.filter((log) => log.status === "FAILED").length;
	const undoable =
		stats?.undoable ?? logs.filter((log) => log.canUndo).length;
	const hasData = totalActions > 0 || logs.length > 0;

	const page = pagination.page || 1;
	const pageSize = pagination.limit || 50;
	const totalPages = Math.max(1, Math.ceil(pagination.total / pageSize));

	if (isLoading && !stats) {
		return (
			<div className="space-y-6 p-6 md:p-8">
				<div className="space-y-2">
					<Skeleton className="h-9 w-44" />
					<Skeleton className="h-5 w-80" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton
							key={index}
							className="h-[130px] rounded-xl bg-background"
						/>
					))}
				</div>
				<Skeleton className="h-[64px] rounded-xl bg-background" />
				<Skeleton className="h-[420px] rounded-xl bg-background" />
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
						Audit logs
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						Every cleanup action, recorded. Undo within the 30-day
						window.
					</p>
				</div>
				{hasData && (
					<div className="flex flex-wrap gap-3">
						<Button
							variant="outline"
							onClick={handleRefresh}
							disabled={isRefreshing}
							className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
						>
							{isRefreshing && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Refresh
						</Button>
						<Button
							onClick={handleExport}
							disabled={isExporting}
							className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isExporting && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Export CSV
						</Button>
					</div>
				)}
			</div>

			{!hasData ? (
				<div className="flex flex-col items-center rounded-2xl border border-border bg-background px-6 py-16 text-center">
					<div
						className="size-20 rounded-full"
						style={{
							background:
								"radial-gradient(circle at 35% 30%, #F6C09A, #E9A39B 45%, #B7A6D8 100%)",
						}}
					/>
					<h2 className="mt-6 font-display text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">
						No actions yet
					</h2>
					<p className="mt-3 max-w-[440px] text-sm text-muted-foreground">
						When you archive, remove, or revoke something, the
						action and its undo window will appear here.
					</p>
					<Button
						asChild
						className="mt-7 h-12 rounded-full bg-lime px-7 text-[15px] font-semibold text-ink hover:bg-lime/90"
					>
						<Link href="/dashboard/playbooks">Go to playbooks</Link>
					</Button>
					{error && (
						<p className="mt-4 text-xs text-muted-foreground">
							{error}
						</p>
					)}
				</div>
			) : (
				<>
					{toastMessage && (
						<div className="flex items-center justify-between gap-4 rounded-md bg-night px-5 py-4 text-paper">
							<div className="flex items-center gap-3">
								<span className="size-2 rounded-full bg-lime" />
								<p className="text-sm font-medium">
									{toastMessage}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setToastMessage(null)}
								className="text-xs font-medium text-[#A8A8A2] transition-colors hover:text-paper"
							>
								Dismiss
							</button>
						</div>
					)}

					{error && (
						<div className="flex items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
							<span className="size-2.5 rounded-full bg-[#F4B183]" />
							<p className="text-sm">{error}</p>
						</div>
					)}

					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<div className="rounded-xl border border-border bg-background p-5">
							<div className="text-[13px] font-medium text-muted-foreground">
								Total actions
							</div>
							<div className="mt-2 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
								{totalActions}
							</div>
						</div>
						<div className="rounded-xl border border-border bg-background p-5">
							<div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
								<span className="size-1.5 rounded-full bg-[#8FA9A8]" />
								Successful
							</div>
							<div className="mt-2 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
								{successful}
							</div>
						</div>
						<div className="rounded-xl border border-border bg-background p-5">
							<div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
								<span className="size-1.5 rounded-full bg-[#C67A51]" />
								Failed
							</div>
							<div className="mt-2 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
								{failed}
							</div>
						</div>
						<div className="rounded-xl bg-night p-5 text-paper">
							<div className="text-[13px] font-medium text-[#A8A8A2]">
								Undoable
							</div>
							<div className="mt-2 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-lime">
								{undoable}
							</div>
							<div className="mt-2 text-xs text-[#A8A8A2]">
								Within 30-day window
							</div>
						</div>
					</div>

					<div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 xl:flex-row xl:items-center">
						<div className="relative min-w-0 flex-1">
							<Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={filters.search}
								onChange={(event) =>
									setFilters({ search: event.target.value })
								}
								placeholder="Search by target or executor..."
								aria-label="Search audit logs"
								className="h-11 rounded-xl border-border bg-background pl-10"
							/>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<div
								className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1"
								role="group"
								aria-label="Filter by action"
							>
								{CATEGORY_TABS.map((tab) => {
									const active =
										filters.category === tab.value;
									return (
										<button
											key={tab.value}
											type="button"
											onClick={() =>
												setFilters({
													category: tab.value,
												})
											}
											aria-pressed={active}
											className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
												active
													? "bg-ink text-paper"
													: "text-muted-foreground hover:text-foreground"
											}`}
										>
											{tab.label}
										</button>
									);
								})}
							</div>

							<div
								className="inline-flex gap-1 rounded-full bg-muted p-1"
								role="group"
								aria-label="Filter by status"
							>
								{STATUS_TABS.map((tab) => {
									const active = filters.status === tab.value;
									return (
										<button
											key={tab.value}
											type="button"
											onClick={() =>
												setFilters({
													status: tab.value,
												})
											}
											aria-pressed={active}
											className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
												active
													? "bg-ink text-paper"
													: "text-muted-foreground hover:text-foreground"
											}`}
										>
											{tab.label}
										</button>
									);
								})}
							</div>
						</div>
					</div>

					<div className="overflow-hidden rounded-xl border border-border bg-background">
						<Table className="min-w-[900px]">
							<TableHeader>
								<TableRow className="border-border bg-muted/60 hover:bg-muted/60">
									<TableHead className="h-11 w-[15%] px-4 text-xs font-medium text-muted-foreground">
										Action
									</TableHead>
									<TableHead className="h-11 w-[31%] px-4 text-xs font-medium text-muted-foreground">
										Target
									</TableHead>
									<TableHead className="h-11 w-[14%] px-4 text-xs font-medium text-muted-foreground">
										Executor
									</TableHead>
									<TableHead className="h-11 w-[13%] px-4 text-xs font-medium text-muted-foreground">
										When
									</TableHead>
									<TableHead className="h-11 w-[12%] px-4 text-xs font-medium text-muted-foreground">
										Status
									</TableHead>
									<TableHead className="h-11 w-[15%] px-4 text-right text-xs font-medium text-muted-foreground">
										Undo
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.length === 0 ? (
									<TableRow className="hover:bg-transparent">
										<TableCell
											colSpan={6}
											className="py-16 text-center"
										>
											<p className="font-display text-xl font-semibold">
												No matching actions
											</p>
											<p className="mt-2 text-sm text-muted-foreground">
												Try a different search or clear
												your filters.
											</p>
											<Button
												variant="outline"
												onClick={() =>
													setFilters({
														category: "all",
														status: "all",
														search: "",
													})
												}
												className="mt-5 h-10 rounded-full border-border bg-background px-5 text-sm font-semibold"
											>
												Clear filters
											</Button>
										</TableCell>
									</TableRow>
								) : (
									logs.map((log) => {
										const meta = getActionMeta(
											log.actionType
										);
										const Icon = meta.icon;
										const source = log.playbook?.source
											? (SOURCE_LABELS[
													log.playbook.source
												] ??
												log.playbook.source)
											: null;
										const targetType = source
											? `${log.targetType} · ${source}`
											: log.targetType;

										return (
											<TableRow
												key={log.id}
												className="border-border"
											>
												<TableCell className="px-4 py-3.5">
													<div className="flex items-center gap-2.5">
														<span
															className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.iconClass}`}
														>
															<Icon className="size-4" />
														</span>
														<span className="text-sm font-medium">
															{meta.label}
														</span>
													</div>
												</TableCell>
												<TableCell className="px-4 py-3.5">
													<div className="max-w-[320px] truncate text-sm font-medium">
														{log.target ||
															"Unknown target"}
													</div>
													<div className="mt-0.5 truncate text-xs text-muted-foreground">
														{targetType}
													</div>
												</TableCell>
												<TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
													{log.executor === "SYSTEM"
														? "System"
														: log.executor}
												</TableCell>
												<TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
													{relativeTime(log.timestamp)}
												</TableCell>
												<TableCell className="px-4 py-3.5">
													<StatusPill log={log} />
												</TableCell>
												<TableCell className="px-4 py-3.5 text-right">
													<UndoButton
														logId={log.id}
														canUndo={log.canUndo}
														daysUntilExpiry={
															log.daysUntilExpiry
														}
														undoExpiresAt={
															log.undoExpiresAt
														}
														isUndone={isLogUndone(
															log
														)}
														actionType={meta.label}
														target={log.target}
														onUndoComplete={() =>
															handleUndoComplete(
																log.target
															)
														}
													/>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>

						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
							<p className="text-xs text-muted-foreground">
								Showing {logs.length} of {pagination.total}{" "}
								actions · Page {page} of {totalPages}
							</p>
							<div className="flex gap-2">
								<Button
									variant="secondary"
									size="sm"
									onClick={() =>
										setPagination({ page: page - 1 })
									}
									disabled={page <= 1 || isLoading}
									className="h-9 rounded-full px-4 text-xs font-semibold"
								>
									Previous
								</Button>
								<Button
									variant="secondary"
									size="sm"
									onClick={() =>
										setPagination({ page: page + 1 })
									}
									disabled={page >= totalPages || isLoading}
									className="h-9 rounded-full px-4 text-xs font-semibold"
								>
									Next
								</Button>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
