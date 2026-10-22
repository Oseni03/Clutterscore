import { Suspense } from "react";
import FilesContent from "@/components/files/files-content";
import { FilesSkeleton } from "@/components/files/files-skeleton";

export default function FilesPage() {
	return (
		<Suspense fallback={<FilesSkeleton />}>
			<FilesContent />
		</Suspense>
	);
}
