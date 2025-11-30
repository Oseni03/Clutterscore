"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useAudit() {
	const [isRunning, setIsRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runAudit = useCallback(async () => {
		setIsRunning(true);
		setError(null);

		try {
			const response = await fetch("/api/audit/run", {
				method: "POST",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to run audit");
			}

			toast.success("Audit completed successfully");
			return data.auditResultId;
		} catch (err) {
			const errorMsg = (err as Error).message || "Failed to run audit";
			setError(errorMsg);
			toast.error(errorMsg);
			throw err;
		} finally {
			setIsRunning(false);
		}
	}, []);

	return {
		runAudit,
		isRunning,
		error,
	};
}
