import { ReactNode } from "react";
import { FilesStoreProvider } from "@/zustand/providers/files-store-provider";

export default function FilesLayout({ children }: { children: ReactNode }) {
	return (
		<FilesStoreProvider>
			<div className="min-h-full">{children}</div>
		</FilesStoreProvider>
	);
}
