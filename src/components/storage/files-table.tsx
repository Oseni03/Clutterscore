import React from "react";
import { Badge } from "@/components/ui/badge";
import {
	HardDrive,
	Image,
	Film,
	Archive,
	Trash2,
	ExternalLink,
} from "lucide-react";
import { Button } from "../ui/button";

export default function FilesTable({
	files,
}: {
	files: Array<{
		name: string;
		size: string;
		type: string;
		location: string;
		lastAccess: string;
	}>;
}) {
	return (
		<div className="space-y-1">
			{files.map((file, i) => (
				<div
					key={i}
					className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg group transition-colors border border-transparent hover:border-border/50"
				>
					<div className="flex items-center gap-3 overflow-hidden">
						<div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
							{file.type === "Video" && (
								<Film className="h-5 w-5" />
							)}
							{file.type === "Archive" && (
								<Archive className="h-5 w-5" />
							)}
							{file.type === "Database" && (
								<HardDrive className="h-5 w-5" />
							)}
							{file.type === "Image" && (
								// eslint-disable-next-line jsx-a11y/alt-text
								<Image className="h-5 w-5" />
							)}
						</div>
						<div className="min-w-0">
							<p className="font-medium truncate">{file.name}</p>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<span>{file.location}</span>
								<span>•</span>
								<span>Last accessed {file.lastAccess}</span>
							</div>
						</div>
					</div>
					<div className="flex items-center gap-4 flex-shrink-0 pl-4">
						<Badge variant="secondary" className="font-mono">
							{file.size}
						</Badge>
						<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
							>
								<ExternalLink className="h-4 w-4" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8 text-destructive hover:text-destructive"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
