"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Download,
	RotateCcw,
	Trash2,
	AlertCircle,
	Clock,
	HardDrive,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ArchivedFile, ArchiveStats } from "@/types/archives";

export default function ArchivesPage() {
	const [archives, setArchives] = useState<ArchivedFile[]>([]);
	const [stats, setStats] = useState<ArchiveStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadArchives();
	}, []);

	const loadArchives = async () => {
		try {
			setLoading(true);
			setError(null);

			const [archivesRes, statsRes] = await Promise.all([
				fetch("/api/archives"),
				fetch("/api/archives/stats"),
			]);

			if (!archivesRes.ok || !statsRes.ok) {
				throw new Error("Failed to load archives");
			}

			const archivesData = await archivesRes.json();
			const statsData = await statsRes.json();

			setArchives(archivesData.archives);
			setStats(statsData);
		} catch (err) {
			setError((err as Error).message);
			toast.error("Failed to load archives");
		} finally {
			setLoading(false);
		}
	};

	const handleDownload = async (archive: ArchivedFile) => {
		try {
			const link = document.createElement("a");
			link.href = archive.downloadUrl;
			link.download = archive.name;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			toast.success(`Downloading ${archive.name}`);
		} catch (err) {
			console.error("ARCHIVE_DOWNLOAD_ERROR: ", err);
			toast.error("Failed to download file");
		}
	};

	const handleRestore = async (archive: ArchivedFile) => {
		try {
			const response = await fetch(
				`/api/archives/${archive.id}/restore`,
				{
					method: "POST",
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Restore failed");
			}

			toast.success(`Restored ${archive.name} to ${archive.source}`);
			loadArchives();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};

	const getDaysUntilExpiry = (expiresAt: string) => {
		const days = Math.ceil(
			(new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
		);
		return days;
	};

	const formatSize = (sizeMb: number) => {
		if (sizeMb < 1) return `${(sizeMb * 1024).toFixed(0)} KB`;
		if (sizeMb > 1024) return `${(sizeMb / 1024).toFixed(2)} GB`;
		return `${sizeMb.toFixed(2)} MB`;
	};

	if (loading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-center h-64">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Archived Files</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Files stored for 30-day recovery period
					</p>
				</div>
				<Button onClick={loadArchives} variant="outline" size="sm">
					<RotateCcw className="h-4 w-4 mr-2" />
					Refresh
				</Button>
			</div>

			{/* Error Alert */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{/* Stats Cards */}
			{stats && (
				<div className="grid md:grid-cols-4 gap-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Total Files
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{stats.totalFiles}
							</div>
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
											<span className="font-medium">
												{count}
											</span>
										</div>
									)
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Archives Table */}
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
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															handleDownload(
																archive
															)
														}
													>
														<Download className="h-4 w-4" />
													</Button>
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
		</div>
	);
}
