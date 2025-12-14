"use client";

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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, Trash2, Download } from "lucide-react";
import { FileType, ToolSource } from "@prisma/client";
import Image from "next/image";
import { FILE_TYPE_ICONS, SOURCE_ICONS } from "@/lib/utils";

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

export function FilesTable({ files, onArchive }: FilesTableProps) {
	const formatSize = (sizeMb: number) => {
		if (sizeMb >= 1024) {
			return `${(sizeMb / 1024).toFixed(2)} GB`;
		}
		return `${sizeMb.toFixed(2)} MB`;
	};

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

	const getFileIcon = (type: FileType) => {
		const Icon = FILE_TYPE_ICONS[type] || FileText;
		const colors = {
			DOCUMENT: "text-gray-500",
			IMAGE: "text-purple-500",
			VIDEO: "text-blue-500",
			MUSIC: "text-pink-500",
			ARCHIVE: "text-yellow-500",
			DATABASE: "text-green-500",
			OTHER: "text-gray-400",
		};
		return <Icon className={`h-4 w-4 ${colors[type]}`} />;
	};

	if (files.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
				<h3 className="text-lg font-medium mb-2">No files found</h3>
				<p className="text-sm">
					Try adjusting your filters or run an audit to discover files
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Size</TableHead>
						<TableHead>Source</TableHead>
						<TableHead>Last Accessed</TableHead>
						<TableHead>Owner</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{files.map((file) => (
						<TableRow key={file.id}>
							<TableCell>
								<div className="flex items-center gap-3">
									<div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center flex-shrink-0">
										{getFileIcon(file.type)}
									</div>
									<div className="min-w-0">
										<div
											className="font-medium truncate max-w-[200px]"
											title={file.name}
										>
											{file.name}
										</div>
										<div className="flex gap-1 mt-1">
											{file.isDuplicate && (
												<Badge
													variant="secondary"
													className="text-[10px] bg-yellow-100 text-yellow-700"
												>
													Duplicate
												</Badge>
											)}
											{file.isPubliclyShared && (
												<Badge
													variant="secondary"
													className="text-[10px] bg-red-100 text-red-700"
												>
													Public
												</Badge>
											)}
										</div>
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Badge
									variant="secondary"
									className="font-mono text-xs"
								>
									{formatSize(file.sizeMb)}
								</Badge>
							</TableCell>
							<TableCell>
								<Image
									src={SOURCE_ICONS[file.source]}
									alt={`${file.source} icon`}
									width={20}
									height={20}
								/>
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{formatDate(file.lastAccessed)}
							</TableCell>
							<TableCell className="text-muted-foreground text-sm">
								{file.ownerEmail || "Unknown"}
							</TableCell>
							<TableCell className="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										{file.url && (
											<DropdownMenuItem asChild>
												<a
													href={file.url}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Download className="mr-2 h-4 w-4" />
													View File
												</a>
											</DropdownMenuItem>
										)}
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => onArchive(file.id)}
										>
											<Trash2 className="mr-2 h-4 w-4" />
											Archive File
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
