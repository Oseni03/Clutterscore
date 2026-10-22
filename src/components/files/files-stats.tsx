"use client";

import { Card } from "@/components/ui/card";

interface FilesStatsProps {
	totalFiles: number;
	totalSize: string;
	duplicatesCount: number;
	publicFilesCount: number;
}

export function FilesStats({
	totalFiles,
	totalSize,
	duplicatesCount,
	publicFilesCount,
}: FilesStatsProps) {
	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<Card className="p-4">
				<p className="text-xs text-muted-foreground mb-1">
					Total Files
				</p>
				<p className="text-2xl font-semibold">{totalFiles}</p>
			</Card>
			<Card className="p-4">
				<p className="text-xs text-muted-foreground mb-1">Total Size</p>
				<p className="text-2xl font-semibold">{totalSize}</p>
			</Card>
			<Card className="p-4">
				<p className="text-xs text-muted-foreground mb-1">Duplicates</p>
				<p className="text-2xl font-semibold text-muted-foreground">
					{duplicatesCount}
				</p>
			</Card>
			<Card className="p-4">
				<p className="text-xs text-muted-foreground mb-1">
					Public Files
				</p>
				<p className="text-2xl font-semibold text-destructive">
					{publicFilesCount}
				</p>
			</Card>
		</div>
	);
}
