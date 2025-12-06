"use client";

import { useEffect, useRef, useState } from "react";

interface UseJobPollingOptions {
	onComplete?: () => void;
	onError?: (error: string) => void;
	pollInterval?: number;
	maxPolls?: number;
}

export function useJobPolling(
	jobId: string | null,
	options: UseJobPollingOptions = {}
) {
	const {
		onComplete,
		onError,
		pollInterval = 3000,
		maxPolls = 100,
	} = options;

	const [status, setStatus] = useState<
		"idle" | "running" | "completed" | "failed"
	>("idle");
	const pollCount = useRef(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!jobId) {
			setStatus("idle");
			return;
		}

		setStatus("running");
		pollCount.current = 0;

		const checkStatus = async () => {
			try {
				pollCount.current += 1;

				if (pollCount.current > maxPolls) {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
					}
					setStatus("failed");
					onError?.("Job timed out");
					return;
				}

				const res = await fetch(`/api/jobs/${jobId}/status`);
				const data = await res.json();

				if (data.status === "completed") {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
					}
					setStatus("completed");
					onComplete?.();
				} else if (data.status === "failed") {
					if (intervalRef.current) {
						clearInterval(intervalRef.current);
					}
					setStatus("failed");
					onError?.(data.error || "Job failed");
				}
			} catch (error) {
				console.error("Failed to check job status:", error);
			}
		};

		checkStatus();
		intervalRef.current = setInterval(checkStatus, pollInterval);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [jobId, onComplete, onError, pollInterval, maxPolls]);

	return { status };
}
