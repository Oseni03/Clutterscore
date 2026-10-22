"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
		<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
			<div>
				<h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] md:text-[36px]">
					Files
				</h1>
				<p className="mt-1.5 text-sm text-muted-foreground">
					Manage large and unused files across every connected app.
				</p>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					variant="outline"
					onClick={onRefresh}
					disabled={isRefreshing}
					className="h-11 rounded-full border-border bg-background px-5 text-sm font-semibold"
				>
					{isRefreshing && (
						<Loader2 className="size-4 animate-spin" />
					)}
					Refresh
				</Button>
				<Button
					onClick={onExport}
					disabled={isExporting || isRefreshing}
					className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
				>
					{isExporting && <Loader2 className="size-4 animate-spin" />}
					Export CSV
				</Button>
			</div>
		</div>
	);
}
