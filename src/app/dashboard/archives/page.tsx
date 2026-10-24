"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchive } from "@/hooks/use-archive";
import ArchivesStats from "@/components/archives/archives-stats";
import ArchivesTable from "@/components/archives/archives-table";

function ArchivesSkeleton() {
	return (
		<>
			<div className="grid gap-4 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="rounded-xl border border-border bg-background p-5"
					>
						<Skeleton className="h-4 w-28" />
						<Skeleton className="mt-3 h-8 w-20" />
					</div>
				))}
			</div>

			<div className="overflow-hidden rounded-xl border border-border bg-background">
				<div className="flex gap-4 bg-muted px-5 py-3">
					{Array.from({ length: 7 }).map((_, index) => (
						<Skeleton key={index} className="h-3 flex-1" />
					))}
				</div>
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="flex items-center gap-4 border-t border-border px-5 py-[18px]"
					>
						<Skeleton className="h-4 flex-[2.6]" />
						<Skeleton className="h-4 flex-1" />
						<Skeleton className="h-4 flex-[0.9]" />
						<Skeleton className="h-4 flex-[1.1]" />
						<Skeleton className="h-6 flex-[1.1] rounded-md" />
						<Skeleton className="h-6 flex-[0.9] rounded-md" />
						<Skeleton className="h-9 w-40 rounded-full" />
					</div>
				))}
			</div>
		</>
	);
}

export default function ArchivesPage() {
	const { archives, stats, loading, error, loadArchives, handleRestore } =
		useArchive();
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			await loadArchives(false);
		} finally {
			setRefreshing(false);
		}
	};

	const isInitialLoading = loading && !stats;
	const showErrorState = !loading && !!error && !stats;

	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-[36px] font-semibold leading-none tracking-[-0.035em]">
						Archived Files
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Stored for 30-day recovery period
					</p>
				</div>
				<Button
					variant="outline"
					onClick={handleRefresh}
					disabled={loading || refreshing}
					className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
				>
					{refreshing && (
						<Loader2 className="size-4 animate-spin" />
					)}
					Refresh
				</Button>
			</div>

			{error && !showErrorState && (
				<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="min-w-0 flex-1 text-sm">{error}</p>
					<Button
						variant="outline"
						onClick={handleRefresh}
						disabled={refreshing}
						className="h-9 rounded-full border-border bg-background px-4 text-[13px] font-semibold"
					>
						Try again
					</Button>
				</div>
			)}

			{isInitialLoading ? (
				<ArchivesSkeleton />
			) : showErrorState ? (
				<div className="rounded-xl border border-border bg-background px-6 py-14 text-center">
					<h2 className="font-display text-[22px] font-semibold">
						Couldn&apos;t load archives
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{error}
					</p>
					<Button
						onClick={() => loadArchives()}
						className="mt-5 h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
					>
						Try again
					</Button>
				</div>
			) : (
				<>
					{stats && <ArchivesStats stats={stats} />}
					<ArchivesTable
						archives={archives}
						handleRestore={handleRestore}
					/>
				</>
			)}
		</div>
	);
}
