"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StorageChart from "@/components/storage/storage-chart";
import FilesTable from "@/components/storage/files-table";
import StorageSuggestions from "@/components/storage/storage-ai-suggestions";
import { useStorage } from "@/hooks/use-storage";
import { formatCurrency } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google Workspace",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft 365",
	FIGMA: "Figma",
	JIRA: "Jira",
};

function updatedLabel(value: Date | null) {
	if (!value) return "Updated just now.";

	const minutes = Math.floor(
		(Date.now() - new Date(value).getTime()) / (1000 * 60)
	);

	if (minutes < 1) return "Updated just now.";
	if (minutes < 60) return `Updated ${minutes} min ago.`;
	if (minutes < 24 * 60) {
		return `Updated ${Math.floor(minutes / 60)} hours ago.`;
	}
	return `Updated ${Math.floor(minutes / 1440)} days ago.`;
}

export default function StoragePage() {
	const {
		stats,
		distribution,
		largeFiles,
		lastUpdated,
		isLoading,
		error,
		refresh,
		exportReport,
		formatSize,
		getUsagePercentage,
		getWastePercentage,
	} = useStorage();

	const [isExporting, setIsExporting] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleExport = async () => {
		setIsExporting(true);
		try {
			await exportReport();
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
		} finally {
			setIsRefreshing(false);
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6 p-6 md:p-8">
				<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div className="space-y-2">
						<Skeleton className="h-9 w-56" />
						<Skeleton className="h-5 w-96" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-11 w-28 rounded-full" />
						<Skeleton className="h-11 w-28 rounded-full" />
					</div>
				</div>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
					<Skeleton className="h-[180px] rounded-xl bg-background md:col-span-2 xl:col-span-1" />
					<Skeleton className="h-[180px] rounded-xl bg-background" />
					<Skeleton className="h-[180px] rounded-xl bg-background" />
				</div>
				<div className="grid gap-4 xl:grid-cols-3">
					<Skeleton className="h-[360px] rounded-xl bg-background" />
					<Skeleton className="h-[360px] rounded-xl bg-background xl:col-span-2" />
				</div>
			</div>
		);
	}

	if (!stats) {
		return (
			<div className="space-y-6 p-6 md:p-8">
				<div>
					<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
						Storage Audit
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						See where your storage goes and what it costs you.
					</p>
				</div>

				<div className="flex flex-col items-center rounded-2xl border border-border bg-background px-6 py-16 text-center">
					<div
						className="size-24 rounded-full"
						style={{
							background:
								"radial-gradient(circle at 35% 30%, #F6C09A, #E9A39B 45%, #B7A6D8 100%)",
						}}
					/>
					<h2 className="mt-7 font-display text-[28px] font-semibold tracking-[-0.03em] sm:text-[32px]">
						No storage data yet
					</h2>
					<p className="mt-3 max-w-[440px] text-sm text-muted-foreground">
						Load your storage data to see usage against your quota,
						the cost of waste, and what to clean up first.
					</p>
					<Button
						onClick={handleRefresh}
						disabled={isRefreshing}
						className="mt-7 h-12 rounded-full bg-lime px-7 text-[15px] font-semibold text-ink hover:bg-lime/90"
					>
						{isRefreshing && (
							<Loader2 className="size-4 animate-spin" />
						)}
						Load Storage Data
					</Button>
					{error && (
						<p className="mt-4 text-xs text-muted-foreground">
							{error}
						</p>
					)}
				</div>
			</div>
		);
	}

	const usagePercentage = getUsagePercentage();
	const wastePercentage = getWastePercentage();
	const freeStorageGb = Math.max(
		0,
		stats.totalQuotaGb - stats.totalUsedGb
	);
	const largestSource = stats.largestWaster.source
		? (SOURCE_LABELS[stats.largestWaster.source] ??
			stats.largestWaster.source)
		: "multiple sources";

	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div>
					<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
						Storage Audit
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{updatedLabel(lastUpdated)} Refreshes automatically
						every 10 minutes.
					</p>
				</div>
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
			</div>

			{error && (
				<div className="flex items-center gap-3 rounded-md border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="text-sm">{error}</p>
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr]">
				<div className="rounded-xl border border-border bg-background p-5 md:col-span-2 xl:col-span-1">
					<div className="text-[13px] font-medium text-muted-foreground">
						Storage used
					</div>
					<div className="mt-2 flex flex-wrap items-baseline gap-2">
						<span className="font-display text-[36px] font-semibold leading-none tracking-[-0.03em] md:text-[40px]">
							{formatSize(stats.totalUsedGb)}
						</span>
						<span className="text-sm text-muted-foreground">
							of {formatSize(stats.totalQuotaGb)} quota
						</span>
					</div>
					<div
						className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted"
						role="progressbar"
						aria-valuenow={usagePercentage}
						aria-valuemin={0}
						aria-valuemax={100}
					>
						<span
							className="h-full rounded-full bg-ink"
							style={{ width: `${usagePercentage}%` }}
						/>
					</div>
					<div className="mt-2 flex justify-between text-xs text-muted-foreground">
						<span>{usagePercentage}% used</span>
						<span>{formatSize(freeStorageGb)} free</span>
					</div>
				</div>

				<div className="rounded-xl bg-night p-5 text-paper">
					<div className="text-[13px] font-medium text-[#A8A8A2]">
						Wasted storage
					</div>
					<div className="mt-2 font-display text-[36px] font-semibold leading-none tracking-[-0.03em] text-lime md:text-[40px]">
						{formatSize(stats.wastedStorageGb)}
					</div>
					<div className="mt-2 text-[13px] text-[#A8A8A2]">
						{wastePercentage}% of used storage
					</div>
					<div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[13px]">
						<span className="text-[#A8A8A2]">Est. monthly cost</span>
						<span className="font-semibold">
							{formatCurrency(stats.estimatedMonthlyCost)}
						</span>
					</div>
				</div>

				<div className="rounded-xl border border-border bg-background p-5">
					<div className="text-[13px] font-medium text-muted-foreground">
						Largest waster
					</div>
					<div className="mt-2 font-display text-[28px] font-semibold leading-none tracking-[-0.03em]">
						{stats.largestWaster.type}
					</div>
					<div className="mt-1 text-[13px] text-muted-foreground">
						{formatSize(stats.largestWaster.sizeGb)}, mostly in{" "}
						{largestSource}
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						<span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
							By type
						</span>
						<span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
							{largestSource}
						</span>
					</div>
				</div>
			</div>

			<div className="grid gap-4 xl:grid-cols-3">
				<div className="rounded-xl border border-border bg-background p-6">
					<h2 className="font-display text-xl font-semibold">
						File type distribution
					</h2>
					<div className="mt-5">
						<StorageChart
							distribution={distribution}
							totalUsedGb={stats.totalUsedGb}
						/>
					</div>
				</div>

				<div className="rounded-xl border border-border bg-background p-6 xl:col-span-2">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-display text-xl font-semibold">
							Largest Unused Files ({">"}1 Year)
						</h2>
						<Link
							href="/dashboard/files"
							className="text-sm font-medium transition-opacity hover:opacity-75"
						>
							View all files →
						</Link>
					</div>
					<div className="mt-3">
						<FilesTable files={largeFiles.slice(0, 5)} />
					</div>
				</div>
			</div>

			<StorageSuggestions
				wastedStorageGb={stats.wastedStorageGb}
				duplicateCount={stats.duplicateCount}
				publicCount={stats.publicCount}
				largestWaster={stats.largestWaster}
			/>
		</div>
	);
}
