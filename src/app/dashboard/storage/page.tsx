"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import StorageChart from "@/components/storage/storage-chart";
import FilesTable from "@/components/storage/files-table";
import StorageSuggestions from "@/components/storage/storage-ai-suggestions";
import { Download, Film, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useStorage } from "@/hooks/use-storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FILE_TYPE_ICONS: Record<string, any> = {
	VIDEO: Film,
	IMAGE: Film,
	DOCUMENT: Film,
	ARCHIVE: Film,
	DATABASE: Film,
};

const CHART_COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
];

export default function StoragePage() {
	const {
		stats,
		distribution,
		largeFiles,
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

	const getLargestWasterIcon = () => {
		if (!stats?.largestWaster) return Film;
		const type = stats.largestWaster.type.toUpperCase();
		return FILE_TYPE_ICONS[type] || Film;
	};

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

				<div className="grid md:grid-cols-3 gap-6">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-32" />
					))}
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					<Skeleton className="h-[400px]" />
					<Skeleton className="md:col-span-2 h-[400px]" />
				</div>
			</div>
		);
	}

	if (error || !stats) {
		return (
			<div className="p-4 md:p-6 space-y-6">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div>
						<h1 className="text-xl md:text-2xl font-display font-bold">
							Storage Audit
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Identify wasted space and optimize your storage
							costs.
						</p>
					</div>
				</div>

				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						{error ||
							"No storage data available. Run an audit to get started."}
					</AlertDescription>
				</Alert>

				<Card className="p-12 text-center">
					<div className="max-w-md mx-auto space-y-4">
						<div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center text-3xl">
							💾
						</div>
						<h2 className="text-xl font-semibold">
							No Storage Data
						</h2>
						<p className="text-muted-foreground">
							Run an audit to analyze your storage usage and
							identify optimization opportunities.
						</p>
						<Button onClick={handleRefresh} disabled={isRefreshing}>
							{isRefreshing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Load Storage Data
								</>
							)}
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	const LargestWasterIcon = getLargestWasterIcon();
	const usagePercentage = getUsagePercentage();
	const wastePercentage = getWastePercentage();

	// Format distribution data for chart with colors
	const chartData = distribution.map((item, index) => ({
		...item,
		color: CHART_COLORS[index % CHART_COLORS.length],
	}));

	// Format large files for table
	const formattedLargeFiles = largeFiles.slice(0, 5).map((file) => ({
		name: file.name,
		size: formatSize(file.sizeMb / 1024), // Convert MB to GB
		type: file.type,
		location: file.path || "Unknown",
		lastAccess: file.lastAccessed
			? new Date(file.lastAccessed).toLocaleDateString()
			: "Never",
	}));

	return (
		<div className="p-4 md:p-6 space-y-6">
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
				<div>
					<h1 className="text-xl md:text-2xl font-display font-bold">
						Storage Audit
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Identify wasted space and optimize your storage costs.
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

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Used Storage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl md:text-3xl font-bold">
							{formatSize(stats.totalUsedGb)}
						</div>
						<Progress
							value={usagePercentage}
							className="h-2 mt-3 mb-2"
						/>
						<p className="text-xs text-muted-foreground">
							{usagePercentage}% of{" "}
							{formatSize(stats.totalQuotaGb)} quota used
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Wasted Storage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl md:text-3xl font-bold text-destructive">
							{formatSize(stats.wastedStorageGb)}
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Est. cost:{" "}
							<span className="font-medium text-foreground">
								${stats.estimatedMonthlyCost.toFixed(0)}/month
							</span>
						</p>
						<p className="text-xs text-muted-foreground">
							{wastePercentage}% of total storage
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Largest Waster
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center dark:bg-blue-900/30">
								<LargestWasterIcon className="h-4 w-4" />
							</div>
							<div className="text-lg md:text-xl font-bold">
								{stats.largestWaster.type}
							</div>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							{stats.largestWaster.location} contains{" "}
							{formatSize(stats.largestWaster.sizeGb)}.
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Charts and Files */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
				{/* Chart Section */}
				<Card className="md:col-span-1">
					<CardHeader>
						<CardTitle>File Type Distribution</CardTitle>
					</CardHeader>
					<CardContent className="h-[350px] flex flex-col">
						<div className="flex-1">
							<StorageChart storageData={chartData} />
						</div>

						{/* Legend */}
						<div className="mt-4 space-y-2 max-h-32 overflow-y-auto pr-1">
							{chartData.map((item) => (
								<div
									key={item.name}
									className="flex items-center justify-between text-sm"
								>
									<div className="flex items-center gap-2">
										<div
											className="h-3 w-3 rounded-sm border flex-shrink-0"
											style={{
												backgroundColor: item.color,
												borderColor:
													"hsl(var(--border))",
											}}
										/>
										<span className="text-foreground">
											{item.name}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground">
											{item.value}%
										</span>
										<span className="text-xs text-muted-foreground">
											({formatSize(item.sizeGb)})
										</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* File List Section */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>
							Largest Unused Files ({">"}1 Year)
						</CardTitle>
					</CardHeader>
					<CardContent>
						{formattedLargeFiles.length > 0 ? (
							<>
								<FilesTable files={formattedLargeFiles} />
								<Button
									variant="outline"
									className="w-full mt-4"
									asChild
								>
									<Link href="/dashboard/files">
										View All Files
									</Link>
								</Button>
							</>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<p className="text-sm">
									No large unused files found
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* AI Suggestions */}
			<StorageSuggestions
				wastedStorageGb={stats.wastedStorageGb}
				largestWaster={stats.largestWaster}
				distribution={distribution}
			/>
		</div>
	);
}
