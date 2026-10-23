"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArchivedFile } from "@/types/archives";

export const DownloadButton = ({ archive }: { archive: ArchivedFile }) => {
	const handleDownload = () => {
		if (!archive.downloadUrl) {
			toast.error("Download not available");
			return;
		}

		try {
			const link = document.createElement("a");
			link.href = archive.downloadUrl;
			link.download = archive.name;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			toast.success(`Downloading ${archive.name}`);
		} catch (error) {
			console.error("ARCHIVE_DOWNLOAD_ERROR: ", error);
			toast.error("Failed to download file");
		}
	};

	return (
		<Button
			variant="secondary"
			onClick={handleDownload}
			disabled={!archive.downloadUrl}
			className="h-9 rounded-full bg-muted px-4 text-[13px] font-semibold text-ink hover:bg-border"
		>
			Download
		</Button>
	);
};
