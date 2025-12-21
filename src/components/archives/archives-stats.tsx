import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Clock, HardDrive } from "lucide-react";
import { formatSize } from "@/lib/utils";
import { ArchiveStats } from "@/types/archives";

function ArchivesStats({ stats }: { stats: ArchiveStats }) {
	return (
		<div className="grid md:grid-cols-4 gap-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Files
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalFiles}</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Size
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold flex items-center gap-2">
						<HardDrive className="h-5 w-5 text-muted-foreground" />
						{formatSize(stats.totalSizeMb)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Expiring Soon
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
						<Clock className="h-5 w-5" />
						{stats.expiringSoon}
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						Within 7 days
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						By Source
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-1">
						{Object.entries(stats.bySource).map(
							([source, count]) => (
								<div
									key={source}
									className="flex justify-between text-sm"
								>
									<span>{source}</span>
									<span className="font-medium">{count}</span>
								</div>
							)
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default ArchivesStats;
