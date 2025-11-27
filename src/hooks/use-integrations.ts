"use client";

import { useState, useEffect } from "react";
import { ToolSource, IntegrationSyncStatus } from "@prisma/client";
import { toast } from "sonner";

interface Integration {
	id: string;
	source: ToolSource;
	isActive: boolean;
	connectedAt: Date;
	lastSyncedAt: Date | null;
	syncStatus: IntegrationSyncStatus;
	lastError: string | null;
	lastErrorAt: Date | null;
	scopes: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	metadata: any;
}

export function useIntegrations() {
	const [integrations, setIntegrations] = useState<Integration[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchIntegrations = async () => {
		try {
			setIsLoading(true);
			const response = await fetch("/api/integrations/list");
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch integrations");
			}

			setIntegrations(data.integrations);
			setError(null);
		} catch (err) {
			setError((err as Error).message);
			toast.error((err as Error).message);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchIntegrations();
	}, []);

	const connectIntegration = (source: ToolSource) => {
		// Redirect to OAuth flow
		window.location.href = `/api/oauth/authorize/${source.toLowerCase()}`;
	};

	const disconnectIntegration = async (source: ToolSource) => {
		try {
			const response = await fetch("/api/integrations/disconnect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to disconnect");
			}

			toast.success(data.message);
			await fetchIntegrations();
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	};

	const refreshToken = async (source: ToolSource) => {
		try {
			const response = await fetch("/api/integrations/refresh-token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to refresh token");
			}

			toast.success(data.message);
			await fetchIntegrations();
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	};

	const registerWebhook = async (source: ToolSource) => {
		try {
			const response = await fetch("/api/webhooks/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to register webhook");
			}

			toast.success(data.message);
			await fetchIntegrations();
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	};

	return {
		integrations,
		isLoading,
		error,
		connectIntegration,
		disconnectIntegration,
		refreshToken,
		registerWebhook,
		refetch: fetchIntegrations,
	};
}
