"use client";

import { useState, useCallback } from "react";
import { ToolSource } from "@prisma/client";
import { toast } from "sonner";
import { useJobPolling } from "./use-job-polling";

export function useConnectorSync() {
	const [jobId, setJobId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [currentSource, setCurrentSource] = useState<string | null>(null);
	const [onCompleteCallback, setOnCompleteCallback] = useState<
		(() => void) | null
	>(null);

	// Poll job status
	const { status } = useJobPolling(jobId, {
		onComplete: () => {
			toast.success(
				currentSource
					? `${currentSource} synced successfully!`
					: "All integrations synced!"
			);
			setJobId(null);
			setCurrentSource(null);
			onCompleteCallback?.();
		},
		onError: (error) => {
			toast.error(`Sync failed: ${error}`);
			setJobId(null);
			setCurrentSource(null);
			setError(error);
		},
	});

	const syncIntegration = useCallback(
		async (source?: ToolSource, onComplete?: () => void) => {
			setError(null);
			setCurrentSource(source || "All integrations");

			try {
				const response = await fetch("/api/integrations/sync", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ source: source || null }),
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to start sync");
				}

				// Store callback for when job completes
				if (onComplete) {
					setOnCompleteCallback(() => onComplete);
				}

				setJobId(data.jobId);
				toast.info(data.message || "Sync started in background...");

				return data.jobId;
			} catch (err) {
				const errorMsg = (err as Error).message || "Failed to sync";
				setError(errorMsg);
				toast.error(errorMsg);
				throw err;
			}
		},
		[]
	);

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
		isSyncing: status === "running",
		error,
		status,
		syncIntegration,
		testConnection,
	};
}
