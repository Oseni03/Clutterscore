"use client";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { FileType, ToolSource } from "@prisma/client";
import { formatSize } from "@/lib/utils";

interface FileItem {
	id: string;
	name: string;
	sizeMb: number;
	type: FileType;
	source: ToolSource;
	lastAccessed: Date | null;
	ownerEmail: string | null;
	isDuplicate: boolean;
	isPubliclyShared: boolean;
	url: string | null;
}

interface FilesTableProps {
	files: FileItem[];
	onArchive: (fileId: string) => void;
}

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft",
	FIGMA: "Figma",
	JIRA: "Jira",
};

const SOURCE_TINTS: Record<string, string> = {
	GOOGLE: "bg-[#DDF35B] text-ink",
	SLACK: "bg-[#B9A9D6] text-ink",
	DROPBOX: "bg-[#8FA9A8] text-ink",
	NOTION: "bg-[#F4B183] text-ink",
	MICROSOFT: "bg-[#E4DDF1] text-ink",
	FIGMA: "bg-[#F4B183] text-ink",
	JIRA: "bg-[#8FA9A8] text-ink",
};

const TYPE_LABELS: Record<string, string> = {
	DOCUMENT: "Docs",
	IMAGE: "Images",
	VIDEO: "Video",
	MUSIC: "Audio",
	ARCHIVE: "Archives",
	DATABASE: "Databases",
	OTHER: "Other",
};

export function FilesTable({ files, onArchive }: FilesTableProps) {
	const formatDate = (date: Date | null) => {
		if (!date) return "Never";
		const now = new Date();
		const diff = now.getTime() - new Date(date).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const months = Math.floor(days / 30);

		if (months > 0)
			return `${months} ${months === 1 ? "month" : "months"} ago`;
		if (days > 0) return `${days} ${days === 1 ? "day" : "days"} ago`;
		return "Today";
	};

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow className="border-border hover:bg-transparent">
						<TableHead className="h-10 pl-5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Name
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Size
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Source
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Type
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Last accessed
						</TableHead>
						<TableHead className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Flags
						</TableHead>
						<TableHead className="pr-5 text-right text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{files.length === 0 ? (
						<TableRow className="hover:bg-transparent">
							<TableCell
								colSpan={7}
								className="px-5 py-14 text-center"
							>
								<div className="font-semibold">
									No files match these filters
								</div>
								<div className="mt-1 text-sm text-muted-foreground">
									Try a different source or type, or clear your
									filters.
								</div>
							</TableCell>
						</TableRow>
					) : (
						files.map((file) => {
							const sourceLabel =
								SOURCE_LABELS[file.source] ?? file.source;
							const sourceTint =
								SOURCE_TINTS[file.source] ??
								"bg-muted text-foreground";

							return (
								<TableRow
									key={file.id}
									className="border-border hover:bg-muted/40"
								>
									<TableCell className="max-w-[280px] py-3.5 pl-5 pr-3">
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
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{formatSize(file.sizeMb)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span
												className={`flex size-[22px] shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold ${sourceTint}`}
											>
												{file.source.charAt(0)}
											</span>
											<span className="text-muted-foreground">
												{sourceLabel}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{TYPE_LABELS[file.type] ?? file.type}
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{formatDate(file.lastAccessed)}
									</TableCell>
									<TableCell>
										<div className="flex flex-wrap gap-1.5">
											{file.isDuplicate && (
												<span className="rounded-sm bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
													Duplicate
												</span>
											)}
											{file.isPubliclyShared && (
												<span className="rounded-sm bg-[#F4B183] px-2 py-1 text-[11px] font-medium text-ink">
													Public
												</span>
											)}
											{!file.isDuplicate &&
												!file.isPubliclyShared && (
													<span className="text-muted-foreground">
														—
													</span>
												)}
										</div>
									</TableCell>
									<TableCell className="py-3.5 pl-3 pr-5 text-right">
										<Button
											variant="secondary"
											size="sm"
											onClick={() => onArchive(file.id)}
											className="h-9 rounded-full bg-muted px-4 text-xs font-semibold"
										>
											Archive
										</Button>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}
