"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useJobPolling } from "./use-job-polling";

export function useAudit() {
	const [jobId, setJobId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [onCompleteCallback, setOnCompleteCallback] = useState<
		(() => void) | null
	>(null);

	// Poll job status
	const { status } = useJobPolling(jobId, {
		onComplete: () => {
			toast.success("Audit completed successfully!");
			setJobId(null);
			onCompleteCallback?.();
		},
		onError: (error) => {
			toast.error(`Audit failed: ${error}`);
			setJobId(null);
			setError(error);
		},
	});

	const runAudit = useCallback(async (onComplete?: () => void) => {
		setError(null);

		try {
			const response = await fetch("/api/audit/run", {
				method: "POST",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to start audit");
			}

			// Store callback for when job completes
			if (onComplete) {
				setOnCompleteCallback(() => onComplete);
			}

			setJobId(data.jobId);
			toast.info(data.message || "Audit started in background...");

			return data.jobId;
		} catch (err) {
			const errorMsg = (err as Error).message || "Failed to start audit";
			setError(errorMsg);
			toast.error(errorMsg);
			throw err;
		}
	}, []);

	return {
		runAudit,
		isRunning: status === "running",
		error,
		status,
	};
}
