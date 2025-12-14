"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download } from "lucide-react";

interface FilesHeaderProps {
	isRefreshing: boolean;
	isExporting: boolean;
	onRefresh: () => void;
	onExport: () => void;
}

export function FilesHeader({
	isRefreshing,
	isExporting,
	onRefresh,
	onExport,
}: FilesHeaderProps) {
	return (
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
					onClick={onRefresh}
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
					onClick={onExport}
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
	);
}
