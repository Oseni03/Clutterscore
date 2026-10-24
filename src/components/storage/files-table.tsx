"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FileData } from "@/types/audit";
import { formatSize } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft",
	FIGMA: "Figma",
	JIRA: "Jira",
};

function formatLastUsed(date: Date | null) {
	if (!date) return "Never";

	const days = Math.floor(
		(Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
	);
	const months = Math.floor(days / 30);

	if (months > 0) return `${months} ${months === 1 ? "month" : "months"} ago`;
	if (days > 0) return `${days} ${days === 1 ? "day" : "days"} ago`;
	return "Today";
}

export default function FilesTable({ files }: { files: FileData[] }) {
	return (
		<div className="-mx-1 overflow-x-auto">
			<Table className="min-w-[480px]">
				<TableHeader>
					<TableRow className="border-border hover:bg-transparent">
						<TableHead className="w-[45%] text-xs text-muted-foreground">
							Name
						</TableHead>
						<TableHead className="text-xs text-muted-foreground">
							Source
						</TableHead>
						<TableHead className="text-xs text-muted-foreground">
							Size
						</TableHead>
						<TableHead className="pr-1 text-xs text-muted-foreground">
							Last used
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{files.length === 0 ? (
						<TableRow className="hover:bg-transparent">
							<TableCell
								colSpan={4}
								className="py-10 text-center text-sm text-muted-foreground"
							>
								No unused files found for this audit.
							</TableCell>
						</TableRow>
					) : (
						files.map((file) => (
							<TableRow
								key={file.id}
								className="border-border hover:bg-muted/40"
							>
								<TableCell className="max-w-0 py-3.5 pl-1">
									{file.url ? (
										<a
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											className="block truncate font-semibold underline-offset-4 hover:underline"
											title={file.name}
										>
											{file.name}
										</a>
									) : (
										<span
											className="block truncate font-semibold"
											title={file.name}
										>
											{file.name}
										</span>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{SOURCE_LABELS[file.source] ?? file.source}
								</TableCell>
								<TableCell className="whitespace-nowrap font-semibold">
									{formatSize(file.sizeMb)}
								</TableCell>
								<TableCell className="whitespace-nowrap pr-1 text-muted-foreground">
									{formatLastUsed(file.lastAccessed)}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
