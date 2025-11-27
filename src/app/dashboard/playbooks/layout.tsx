import { ReactNode } from "react";
import { PlaybooksStoreProvider } from "@/zustand/providers/playbooks-store-provider";

export default function PlaybooksLayout({ children }: { children: ReactNode }) {
	return <PlaybooksStoreProvider>{children}</PlaybooksStoreProvider>;
}
