import { ReactNode } from "react";
import { StorageStoreProvider } from "@/zustand/providers/storage-store-provider";

export default function StorageLayout({ children }: { children: ReactNode }) {
	return (
		<StorageStoreProvider>
			<div className="min-h-full">{children}</div>
		</StorageStoreProvider>
	);
}
