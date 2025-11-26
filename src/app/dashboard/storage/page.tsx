import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import StorageChart from "@/components/storage/storage-chart";
import FilesTable from "@/components/storage/files-table";
import { Download, Film } from "lucide-react";
import StorageAISuggestions from "@/components/storage/storage-ai-suggestions";

const storageData = [
	{ name: "Documents", value: 35, color: "hsl(var(--chart-1))" },
	{ name: "Images", value: 25, color: "hsl(var(--chart-2))" },
	{ name: "Video", value: 20, color: "hsl(var(--chart-3))" },
	{ name: "Archives", value: 15, color: "hsl(var(--chart-4))" },
	{ name: "Audio", value: 5, color: "hsl(var(--chart-5))" },
];

const largeFiles = [
	{
		name: "Q3_All_Hands_Recording.mp4",
		size: "2.4 GB",
		type: "Video",
		location: "Google Drive / Marketing",
		lastAccess: "14 months ago",
	},
	{
		name: "Product_Demo_Raw_Footage.zip",
		size: "1.8 GB",
		type: "Archive",
		location: "Dropbox / Product",
		lastAccess: "2 years ago",
	},
	{
		name: "Backup_2023_Main_DB.sql",
		size: "1.2 GB",
		type: "Database",
		location: "Google Drive / Engineering",
		lastAccess: "18 months ago",
	},
	{
		name: "Design_Assets_v2_Final_Final.psd",
		size: "840 MB",
		type: "Image",
		location: "Google Drive / Design",
		lastAccess: "11 months ago",
	},
	{
		name: "Townhall_Oct_2023.mov",
		size: "650 MB",
		type: "Video",
		location: "Slack / #general",
		lastAccess: "16 months ago",
	},
];

export default function StoragePage() {
	return (
		<div className="p-6 space-y-6">
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
				<div>
					<h1 className="text-2xl font-display font-bold">
						Storage Audit
					</h1>
					<p className="text-muted-foreground">
						Identify wasted space and optimize your storage costs.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline">
						<Download className="mr-2 h-4 w-4" />
						Export Report
					</Button>
				</div>
			</div>

			<div className="grid md:grid-cols-3 gap-6 mb-8">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Used Storage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold">42.8 TB</div>
						<Progress value={82} className="h-2 mt-3 mb-2" />
						<p className="text-xs text-muted-foreground">
							82% of 50 TB quota used
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Wasted Storage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-bold text-destructive">
							12.4 TB
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Est. cost:{" "}
							<span className="font-medium text-foreground">
								$480/month
							</span>
						</p>
						<p className="text-xs text-muted-foreground">
							Old files, duplicates, trash
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Largest Waster
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
								<Film className="h-4 w-4" />
							</div>
							<div className="text-xl font-bold">Video Files</div>
						</div>
						<p className="text-xs text-muted-foreground mt-2">
							Marketing folder contains 8TB of raw footage.
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid md:grid-cols-3 gap-6">
				{/* Chart Section */}
				<Card className="md:col-span-1">
					<CardHeader>
						<CardTitle>File Type Distribution</CardTitle>
					</CardHeader>
					<CardContent className="h-[350px]">
						<StorageChart storageData={storageData} />
						<div className="mt-4 space-y-2">
							{storageData.map((item) => (
								<div
									key={item.name}
									className="flex items-center justify-between text-sm"
								>
									<div className="flex items-center gap-2">
										<div
											className="w-3 h-3 rounded-full"
											style={{
												backgroundColor: item.color,
											}}
										/>
										<span>{item.name}</span>
									</div>
									<span className="font-mono text-muted-foreground">
										{item.value}%
									</span>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* File List Section */}
				<Card className="md:col-span-2">
					<CardHeader>
						<CardTitle>
							Largest Unused Files ({">"}1 Year)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<FilesTable files={largeFiles} />
						<Button
							variant="outline"
							className="w-full mt-4"
							asChild
						>
							<Link href="/dashboard/files">View All Files</Link>
						</Button>
					</CardContent>
				</Card>
			</div>

			<StorageAISuggestions />
		</div>
	);
}
