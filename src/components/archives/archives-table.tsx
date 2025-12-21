import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DownloadButton } from "@/components/archives/download-button";
import { formatSize } from "@/lib/utils";
import { ArchivedFile } from "@/types/archives";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../ui/button";

function ArchivesTable({
	archives,
	handleRestore,
}: {
	archives: ArchivedFile[];
	handleRestore: (archive: ArchivedFile) => Promise<void>;
}) {
	const getDaysUntilExpiry = (expiresAt: string) => {
		const days = Math.ceil(
			(new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		return days;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Archived Files</CardTitle>
			</CardHeader>
			<CardContent>
				{archives.length === 0 ? (
					<div className="text-center py-12 text-muted-foreground">
						<Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<h3 className="text-lg font-medium mb-2">
							No archived files
						</h3>
						<p className="text-sm">
							Files archived from playbooks will appear here
						</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Size</TableHead>
								<TableHead>Archived</TableHead>
								<TableHead>Expires</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{archives.map((archive) => {
								const daysLeft = getDaysUntilExpiry(
									archive.expiresAt
								);
								const isExpiringSoon = daysLeft <= 7;

								return (
									<TableRow key={archive.id}>
										<TableCell className="font-medium max-w-xs truncate">
											{archive.name}
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{archive.source}
											</Badge>
										</TableCell>
										<TableCell>
											{formatSize(archive.sizeMb)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{new Date(
												archive.archivedAt
											).toLocaleDateString()}
										</TableCell>
										<TableCell>
											<div
												className={`text-sm ${isExpiringSoon ? "text-orange-600 font-medium" : "text-muted-foreground"}`}
											>
												{daysLeft} days
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													archive.status ===
													"ARCHIVED"
														? "default"
														: archive.status ===
															  "RESTORED"
															? "secondary"
															: "outline"
												}
											>
												{archive.status}
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-2 justify-end">
												<DownloadButton
													archive={archive}
												/>
												{archive.status ===
													"ARCHIVED" && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleRestore(
																archive
															)
														}
													>
														<RotateCcw className="h-4 w-4" />
													</Button>
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

export default ArchivesTable;
