"use client";

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
		<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
			<div className="rounded-md border border-border bg-background p-5">
				<div className="text-[13px] text-muted-foreground">
					Total files
				</div>
				<div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
					{totalFiles.toLocaleString()}
				</div>
			</div>
			<div className="rounded-md border border-border bg-background p-5">
				<div className="text-[13px] text-muted-foreground">
					Total size
				</div>
				<div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
					{totalSize}
				</div>
			</div>
			<div className="rounded-md border border-border bg-background p-5">
				<div className="text-[13px] text-muted-foreground">
					Duplicates
				</div>
				<div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.04em]">
					{duplicatesCount.toLocaleString()}
				</div>
			</div>
			<div className="rounded-md bg-night p-5 text-paper">
				<div className="text-[13px] text-[#A8A8A2]">Public files</div>
				<div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-[-0.04em] text-lime">
					{publicFilesCount.toLocaleString()}
				</div>
			</div>
		</div>
	);
}
