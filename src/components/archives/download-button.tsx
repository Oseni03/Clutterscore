import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ArchivedFile } from "@/types/archives";

export const DownloadButton = ({ archive }: { archive: ArchivedFile }) => {
	const handleDownload = async () => {
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

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span>
					<Button
						variant="ghost"
						size="sm"
						disabled
						// onClick={() =>
						// 	handleDownload(
						// 		archive
						// 	)
						// }
					>
						<Download className="h-4 w-4" />
					</Button>
				</span>
			</TooltipTrigger>

			<TooltipContent>
				<p>Download not available</p>
			</TooltipContent>
		</Tooltip>
	);
};
