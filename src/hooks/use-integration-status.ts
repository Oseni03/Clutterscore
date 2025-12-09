"use client";

import { useState, useEffect } from "react";
import { ToolSource, IntegrationSyncStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

interface IntegrationStatus {
	source: ToolSource;
	status: IntegrationSyncStatus;
	lastSynced: Date | null;
	error: string | null;
}

interface Status {
	total: number;
	syncing: number;
	error: number;
	idle: number;
	integrations: IntegrationStatus[];
}

export function useIntegrationStatus(pollInterval: number = 5000) {
	const [status, setStatus] = useState<Status | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const fetchStatus = async () => {
		try {
			const response = await fetch("/api/integrations/status");
			const data = await response.json();

			if (response.ok) {
				setStatus(data.status);
			}
		} catch (err) {
			logger.error("Failed to fetch status:", err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, pollInterval);
		return () => clearInterval(interval);
	}, [pollInterval]);

	return {
		status,
		isLoading,
		refetch: fetchStatus,
	};
}
