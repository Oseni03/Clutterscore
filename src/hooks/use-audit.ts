import { useState } from "react";
import { toast } from "sonner";

export function useAudit() {
	const [isRunning, setIsRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const runAudit = async () => {
		setIsRunning(true);
		setError(null);

		try {
			const response = await fetch("/api/audit/run", {
				method: "POST",
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Audit failed");
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
	};

	const fetchLatestAudit = async () => {
		try {
			const response = await fetch("/api/audit/latest");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch audit");
			}

			return data.auditResult;
		} catch (err) {
			toast.error((err as Error).message || "Failed to fetch audit");
			throw err;
		}
	};

	return {
		isRunning,
		error,
		runAudit,
		fetchLatestAudit,
	};
}
