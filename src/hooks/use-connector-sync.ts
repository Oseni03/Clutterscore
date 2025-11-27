import { useState } from "react";
import { ToolSource } from "@prisma/client";
import { toast } from "sonner";

export function useConnectorSync() {
	const [isSyncing, setIsSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const syncIntegration = async (source?: ToolSource) => {
		setIsSyncing(true);
		setError(null);

		try {
			const response = await fetch("/api/integrations/sync", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Sync failed");
			}

			toast.success(
				source
					? `${source} synced successfully`
					: "All integrations synced successfully"
			);

			return data.results;
		} catch (err) {
			const errorMsg = (err as Error).message || "Failed to sync";
			setError(errorMsg);
			toast.error(errorMsg);
			throw err;
		} finally {
			setIsSyncing(false);
		}
	};

	const testConnection = async (source: ToolSource) => {
		try {
			const response = await fetch("/api/integrations/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Connection test failed");
			}

			return data.isConnected;
		} catch (err) {
			toast.error((err as Error).message || "Connection test failed");
			return false;
		}
	};

	return {
		isSyncing,
		error,
		syncIntegration,
		testConnection,
	};
}
