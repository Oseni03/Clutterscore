"use client";

import { useState, useEffect } from "react";
import { ToolSource, IntegrationSyncStatus } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { showUpgradeToast } from "@/components/upgrade-toast";

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

const FREE_TIER_INTEGRATION_LIMIT = 3;

export function useIntegrations() {
	const router = useRouter();
	const [integrations, setIntegrations] = useState<Integration[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Get subscription tier
	const activeOrganization = useOrganizationStore(
		(state) => state.activeOrganization
	);
	const subscriptionTier = activeOrganization?.subscriptionTier || "free";

	const fetchIntegrations = async (showLoading = true) => {
		try {
			if (showLoading) setIsLoading(true);
			const response = await fetch("/api/integrations");
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
			if (showLoading) setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchIntegrations();
	}, []);

	const connectIntegration = (source: ToolSource) => {
		// 🚨 SUBSCRIPTION CHECK: Free tier limited to 3 integrations
		if (subscriptionTier === "free") {
			const activeIntegrations = integrations.filter(
				(integration) => integration.isActive
			);

			if (activeIntegrations.length >= FREE_TIER_INTEGRATION_LIMIT) {
				showUpgradeToast(
					"Integration Limit Reached",
					`Free tier is limited to ${FREE_TIER_INTEGRATION_LIMIT} integrations. Upgrade to Pro for unlimited integrations, automated cleanups, and advanced features.`,
					router
				);
				return;
			}
		}

		// Redirect to OAuth flow
		window.location.href = `/api/oauth/${source.toLowerCase()}/authorize`;
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
			await fetchIntegrations(false);
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
			await fetchIntegrations(false);
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
			await fetchIntegrations(false);
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	};

	const unregisterWebhook = async (source: ToolSource) => {
		try {
			const response = await fetch("/api/webhooks/unregister", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ source }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to disable webhook");
			}

			toast.success(data.message);
			await fetchIntegrations(false);
		} catch (err) {
			toast.error((err as Error).message);
			throw err;
		}
	};

	// Helper to check if user can add more integrations
	const canAddIntegration = () => {
		if (subscriptionTier !== "free") return true;

		const activeIntegrations = integrations.filter(
			(integration) => integration.isActive
		);
		return activeIntegrations.length < FREE_TIER_INTEGRATION_LIMIT;
	};

	// Helper to get remaining integration slots for free tier
	const getRemainingIntegrationSlots = () => {
		if (subscriptionTier !== "free") return null;

		const activeIntegrations = integrations.filter(
			(integration) => integration.isActive
		);
		return Math.max(
			0,
			FREE_TIER_INTEGRATION_LIMIT - activeIntegrations.length
		);
	};

	// Helper to get active integrations count
	const getActiveIntegrationsCount = () => {
		return integrations.filter((integration) => integration.isActive)
			.length;
	};

	return {
		integrations,
		isLoading,
		error,
		subscriptionTier,
		connectIntegration,
		disconnectIntegration,
		refreshToken,
		registerWebhook,
		unregisterWebhook,
		refetch: () => fetchIntegrations(false),

		// Subscription helpers
		canAddIntegration,
		getRemainingIntegrationSlots,
		getActiveIntegrationsCount,
		integrationLimit:
			subscriptionTier === "free" ? FREE_TIER_INTEGRATION_LIMIT : null,
	};
}
