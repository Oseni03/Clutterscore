"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RotateCcw, AlertCircle, Loader2 } from "lucide-react";
import { useArchive } from "@/hooks/use-archive";
import ArchivesStats from "@/components/archives/archives-stats";
import ArchivesTable from "@/components/archives/archives-table";

export default function ArchivesPage() {
	const { archives, stats, loading, error, loadArchives, handleRestore } =
		useArchive();

	if (loading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-center h-64">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Archived Files</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Files stored for 30-day recovery period
					</p>
				</div>
				<Button onClick={loadArchives} variant="outline" size="sm">
					<RotateCcw className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Stats Cards */}
			{stats && <ArchivesStats stats={stats} />}

			{/* Archives Table */}
			<ArchivesTable archives={archives} handleRestore={handleRestore} />
		</div>
	);
}
