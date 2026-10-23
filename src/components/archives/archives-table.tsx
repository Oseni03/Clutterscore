"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/archives/download-button";
import { formatSize } from "@/lib/utils";
import { ArchivedFile } from "@/types/archives";

const SOURCE_BRANDS: Record<string, { initial: string; className: string }> = {
	GOOGLE: { initial: "G", className: "bg-lime text-ink" },
	SLACK: { initial: "S", className: "bg-[#B9A9D6] text-ink" },
	DROPBOX: { initial: "D", className: "bg-[#8FA9A8] text-ink" },
	NOTION: { initial: "N", className: "bg-[#F4B183] text-ink" },
	MICROSOFT: { initial: "M", className: "bg-muted text-foreground" },
	FIGMA: { initial: "F", className: "bg-muted text-foreground" },
	JIRA: { initial: "J", className: "bg-muted text-foreground" },
};

const SOURCE_LABELS: Record<string, string> = {
	GOOGLE: "Google",
	SLACK: "Slack",
	DROPBOX: "Dropbox",
	NOTION: "Notion",
	MICROSOFT: "Microsoft 365",
	FIGMA: "Figma",
	JIRA: "Jira",
};

function getDaysUntilExpiry(expiresAt: string) {
	return Math.max(
		0,
		Math.ceil(
			(new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		)
	);
}

function getStatusLabel(archive: ArchivedFile, daysLeft: number) {
	if (archive.status === "RESTORED") return "Restored";
	if (archive.status === "DELETED") return "Deleted";
	if (archive.status === "STAGED") return "Staged";
	return daysLeft <= 7 ? "Expiring" : "Archived";
}

function ArchivesTable({
	archives,
	handleRestore,
}: {
	archives: ArchivedFile[];
	handleRestore: (archive: ArchivedFile) => Promise<boolean>;
}) {
	const [restoringId, setRestoringId] = useState<string | null>(null);

	const handleRestoreClick = async (archive: ArchivedFile) => {
		setRestoringId(archive.id);
		try {
			await handleRestore(archive);
		} finally {
			setRestoringId(null);
		}
	};

	return (
		<div className="overflow-hidden rounded-xl border border-border bg-background">
			<div className="overflow-x-auto">
				<table className="w-full min-w-[900px] border-collapse text-sm">
					<thead>
						<tr className="bg-muted text-left text-xs font-medium text-muted-foreground">
							<th className="w-[26%] px-5 py-3 font-medium">
								Name
							</th>
							<th className="w-[13%] px-5 py-3 font-medium">
								Source
							</th>
							<th className="w-[10%] px-5 py-3 font-medium">
								Size
							</th>
							<th className="w-[12%] px-5 py-3 font-medium">
								Archived
							</th>
							<th className="w-[11%] px-5 py-3 font-medium">
								Expires in
							</th>
							<th className="w-[10%] px-5 py-3 font-medium">
								Status
							</th>
							<th className="px-5 py-3 text-right font-medium">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{archives.length === 0 ? (
							<tr className="border-t border-border">
								<td colSpan={7} className="px-6 py-14 text-center">
									<div className="font-display text-[22px] font-semibold">
										Nothing archived
									</div>
									<p className="mt-2 text-sm text-muted-foreground">
										Files you archive appear here for 30
										days.
									</p>
								</td>
							</tr>
						) : (
							archives.map((archive) => {
								const daysLeft = getDaysUntilExpiry(
									archive.expiresAt
								);
								const expiring = daysLeft <= 7;
								const status = getStatusLabel(archive, daysLeft);
								const brand = SOURCE_BRANDS[archive.source] ?? {
									initial: archive.source.charAt(0),
									className: "bg-muted text-foreground",
								};

								return (
									<tr
										key={archive.id}
										className="h-[60px] border-t border-border"
									>
										<td className="px-5 py-3 font-semibold">
											<div className="max-w-[260px] truncate">
												{archive.name}
											</div>
										</td>
										<td className="px-5 py-3">
											<span className="inline-flex items-center gap-2">
												<span
													className={`flex size-[22px] items-center justify-center rounded-md text-[11px] font-semibold ${brand.className}`}
												>
													{brand.initial}
												</span>
												{SOURCE_LABELS[archive.source] ??
													archive.source}
											</span>
										</td>
										<td className="px-5 py-3">
											{formatSize(archive.sizeMb)}
										</td>
										<td className="px-5 py-3 text-muted-foreground">
											{format(
												new Date(archive.archivedAt),
												"MMM d, yyyy"
											)}
										</td>
										<td className="px-5 py-3">
											<span
												className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
													expiring
														? "bg-[#F4B183] text-ink"
														: "bg-muted text-foreground"
												}`}
											>
												{daysLeft}{" "}
												{daysLeft === 1
													? "day"
													: "days"}
											</span>
										</td>
										<td className="px-5 py-3">
											<span className="inline-flex rounded-md border border-border px-2 py-1 text-xs font-medium">
												{status}
											</span>
										</td>
										<td className="px-5 py-3">
											<div className="flex justify-end gap-2">
												<DownloadButton
													archive={archive}
												/>
												{archive.status ===
													"ARCHIVED" && (
													<Button
														onClick={() =>
															handleRestoreClick(
																archive
															)
														}
														disabled={
															restoringId ===
															archive.id
														}
														className="h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink/90"
													>
														{restoringId ===
															archive.id && (
															<Loader2 className="size-3.5 animate-spin" />
														)}
														Restore
													</Button>
												)}
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

export default ArchivesTable;
