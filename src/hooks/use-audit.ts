"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useJobPolling } from "./use-job-polling";
import { useRouter } from "next/navigation";

interface AuditThrottleError {
	error: string;
	resetDate?: string;
	upgrade?: {
		message: string;
		tiers: string[];
	};
}

export function useAudit() {
	const router = useRouter();
	const [jobId, setJobId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [throttleInfo, setThrottleInfo] = useState<AuditThrottleError | null>(
		null
	);
	const [onCompleteCallback, setOnCompleteCallback] = useState<
		(() => void) | null
	>(null);

	// Poll job status
	const { status } = useJobPolling(jobId, {
		onComplete: () => {
			toast.success("Audit completed successfully!");
			setJobId(null);
			setThrottleInfo(null);
			onCompleteCallback?.();
		},
		onError: (error) => {
			toast.error(`Audit failed: ${error}`);
			setJobId(null);
			setError(error);
		},
	});

	const runAudit = useCallback(
		async (onComplete?: () => void) => {
			setError(null);
			setThrottleInfo(null);

			try {
				const response = await fetch("/api/audit/run", {
					method: "POST",
				});

				const data = await response.json();

				// Handle throttling (429 Too Many Requests)
				if (response.status === 429) {
					setThrottleInfo(data as AuditThrottleError);

					// Show toast with upgrade CTA
					toast.error(data.error || "Monthly audit limit reached", {
						description: data.upgrade?.message,
						action: data.upgrade
							? {
									label: "Upgrade to Pro",
									onClick: () =>
										router.push(
											"/dashboard/settings/billing"
										),
								}
							: undefined,
						duration: 7000,
					});

					return null;
				}

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
				const errorMsg =
					(err as Error).message || "Failed to start audit";
				setError(errorMsg);
				toast.error(errorMsg);
				throw err;
			}
		},
		[router]
	);

	return {
		runAudit,
		isRunning: status === "running",
		error,
		status,
		throttleInfo, // Expose throttle info for UI components
		isThrottled: throttleInfo !== null,
	};
}
