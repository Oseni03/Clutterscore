import { ReactNode } from "react";
import { AuditLogsStoreProvider } from "@/zustand/providers/audit-logs-store-provider";

export default function AuditLogsLayout({ children }: { children: ReactNode }) {
	return (
		<AuditLogsStoreProvider>
			<div className="min-h-screen bg-background">{children}</div>
		</AuditLogsStoreProvider>
	);
}
