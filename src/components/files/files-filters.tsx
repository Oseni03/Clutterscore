"use client";

import { Input } from "@/components/ui/input";
import { FileType } from "@prisma/client";

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft",
	FIGMA: "Figma",
	JIRA: "Jira",
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

interface FilesFiltersProps {
	search: string;
	source: string;
	type: FileType | "all";
	isDuplicate: boolean | null;
	isPubliclyShared: boolean | null;
	onSearchChange: (value: string) => void;
	onSourceChange: (value: string) => void;
	onTypeChange: (value: string) => void;
	onToggleDuplicate: () => void;
	onTogglePublic: () => void;
	onClearFilters: () => void;
}

export function FilesFilters({
	search,
	source,
	type,
	isDuplicate,
	isPubliclyShared,
	onSearchChange,
	onSourceChange,
	onTypeChange,
	onToggleDuplicate,
	onTogglePublic,
	onClearFilters,
}: FilesFiltersProps) {
	return (
		<div className="rounded-md border border-border bg-background p-5">
			<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<div className="w-full max-w-[320px] flex-1">
					<label
						htmlFor="file-search"
						className="mb-1.5 block text-xs text-muted-foreground"
					>
						Search
					</label>
					<Input
						id="file-search"
						placeholder="Search files..."
						className="h-11 rounded-sm border-border bg-background"
						value={search}
						onChange={(event) =>
							onSearchChange(event.target.value)
						}
					/>
				</div>

				<div className="flex flex-1 flex-wrap items-end gap-x-5 gap-y-3">
					<div>
						<div className="mb-1.5 text-xs text-muted-foreground">
							Source
						</div>
						<div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
							<button
								type="button"
								onClick={() => onSourceChange("all")}
								className={`h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
									source === "all"
										? "bg-ink text-paper"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								All
							</button>
							{Object.entries(SOURCE_LABELS).map(
								([value, label]) => (
									<button
										key={value}
										type="button"
										onClick={() => onSourceChange(value)}
										className={`h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
											source === value
												? "bg-ink text-paper"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{label}
									</button>
								)
							)}
						</div>
					</div>

					<div>
						<div className="mb-1.5 text-xs text-muted-foreground">
							Type
						</div>
						<div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1">
							<button
								type="button"
								onClick={() => onTypeChange("all")}
								className={`h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
									type === "all"
										? "bg-ink text-paper"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								All
							</button>
							{Object.entries(TYPE_LABELS).map(
								([value, label]) => (
									<button
										key={value}
										type="button"
										onClick={() => onTypeChange(value)}
										className={`h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
											type === value
												? "bg-ink text-paper"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{label}
									</button>
								)
							)}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							aria-pressed={isDuplicate === true}
							onClick={onToggleDuplicate}
							className={`h-11 rounded-sm px-4 text-xs font-semibold transition-colors ${
								isDuplicate === true
									? "bg-ink text-paper"
									: "bg-muted text-muted-foreground hover:text-foreground"
							}`}
						>
							Duplicates only
						</button>
						<button
							type="button"
							aria-pressed={isPubliclyShared === true}
							onClick={onTogglePublic}
							className={`h-11 rounded-sm px-4 text-xs font-semibold transition-colors ${
								isPubliclyShared === true
									? "bg-ink text-paper"
									: "bg-muted text-muted-foreground hover:text-foreground"
							}`}
						>
							Public only
						</button>
						<button
							type="button"
							onClick={onClearFilters}
							className="h-11 px-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
						>
							Clear
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
