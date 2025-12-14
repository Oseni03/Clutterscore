"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter } from "lucide-react";
import { FileType, ToolSource } from "@prisma/client";
import Image from "next/image";
import { FILE_TYPE_ICONS, SOURCE_ICONS } from "@/lib/utils";

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
		<div className="flex flex-col md:flex-row gap-4 justify-between">
			{/* Search */}
			<div className="relative flex-1 md:max-w-sm">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search files..."
					className="pl-9"
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>

			{/* Filters */}
			<div className="flex gap-2 flex-wrap">
				{/* Source Filter */}
				<Select value={source} onValueChange={onSourceChange}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Source" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sources</SelectItem>
						{Object.keys(SOURCE_ICONS).map((src) => (
							<SelectItem key={src} value={src}>
								<div className="flex items-center gap-2">
									<Image
										src={SOURCE_ICONS[src as ToolSource]}
										alt={`${src} icon`}
										width={16}
										height={16}
									/>
									{src}
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Type Filter */}
				<Select value={type} onValueChange={onTypeChange}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						{Object.keys(FILE_TYPE_ICONS).map((fileType) => (
							<SelectItem key={fileType} value={fileType}>
								{fileType}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Special Filters */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="icon">
							<Filter className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onToggleDuplicate}>
							{isDuplicate === true && "✓ "}
							Duplicates Only
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onTogglePublic}>
							{isPubliclyShared === true && "✓ "}
							Public Files Only
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onClearFilters}>
							Clear All Filters
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
