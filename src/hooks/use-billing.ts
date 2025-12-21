"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { logger } from "@/lib/logger";
import {
	syncUserCount,
	verifyUserCount,
	initiateCheckout,
} from "@/server/subscription";
import { BillingInterval } from "@/lib/subscription-plans";

interface EligiblePlan {
	id: string;
	name: string;
	description: string;
	minUsers: number;
	maxUsers: number;
	price: string;
	priceValue: number;
	features: string[];
	popular: boolean;
}

interface RecommendedPlan {
	id: string;
	name: string;
	description: string;
	minUsers: number;
	maxUsers: number;
}

export function useBilling() {
	const { activeOrganization, subscription, loadSubscription, isAdmin } =
		useOrganizationStore((state) => state);
	const [isUpgrading, setIsUpgrading] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [selectedInterval, setSelectedInterval] =
		useState<BillingInterval>("yearly");

	// User count state
	const [userCount, setUserCount] = useState<number | null>(null);
	const [userCountSource, setUserCountSource] = useState<string | null>(null);
	const [userCountLastSync, setUserCountLastSync] = useState<Date | null>(
		null
	);
	const [userCountVerified, setUserCountVerified] = useState(false);
	const [needsUserCountSync, setNeedsUserCountSync] = useState(false);

	// Eligible plans state
	const [eligiblePlans, setEligiblePlans] = useState<EligiblePlan[]>([]);
	const [recommendedPlan, setRecommendedPlan] =
		useState<RecommendedPlan | null>(null);

	useEffect(() => {
		if (activeOrganization?.id) {
			loadSubscription(activeOrganization.id).catch((err) => {
				logger.error("Failed to load subscription:", err);
			});
			fetchEligiblePlans();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeOrganization?.id, loadSubscription]);

	const fetchEligiblePlans = async () => {
		if (!activeOrganization?.id) return;

		try {
			const response = await fetch(`/api/billing/eligible-plans`);
			if (response.ok) {
				const data = await response.json();
				setEligiblePlans(data.eligiblePlans || []);
				setRecommendedPlan(data.recommendedPlan);
				setUserCount(data.userCount);
				setUserCountSource(data.userCountSource);
				setUserCountLastSync(
					data.userCountLastSync
						? new Date(data.userCountLastSync)
						: null
				);
				setUserCountVerified(data.userCountVerified || false);
				setNeedsUserCountSync(data.needsUserCountSync || false);
			}
		} catch (error) {
			logger.error("Failed to fetch eligible plans:", error);
		}
	};

	const handleSyncUserCount = async () => {
		if (!activeOrganization?.id) return;

		setIsSyncing(true);
		toast.loading("Syncing user count from integrations...");

		const result = await syncUserCount(activeOrganization.id);

		toast.dismiss();

		if (result.error) {
			toast.error(result.error);
		} else {
			setUserCount(result.userCount);
			setUserCountSource(result.source);
			toast.success(
				`Detected ${result.userCount} users from ${result.source}`
			);
			await fetchEligiblePlans();
		}

		setIsSyncing(false);
	};

	const handleVerifyUserCount = async () => {
		if (!activeOrganization?.id || !userCount) return;

		const result = await verifyUserCount(activeOrganization.id, userCount);

		if (result.error) {
			toast.error(result.error);
		} else {
			setUserCountVerified(true);
			toast.success("User count verified");
			await fetchEligiblePlans();
		}
	};

	const handleUpgradeSubscription = async () => {
		if (!activeOrganization?.id) {
			toast.error("No active organization selected");
			return;
		}

		if (!isAdmin) {
			toast.error("You do not have permission to upgrade subscription");
			return;
		}

		if (!userCount || userCount === 0) {
			toast.error("Please sync your user count first");
			return;
		}

		if (eligiblePlans.length === 0) {
			if (userCount < 350) {
				toast.error(
					"Your organization has fewer than 350 users. Please stay on the Free plan or contact sales."
				);
			} else if (userCount > 2000) {
				toast.error(
					"Your organization exceeds 2,000 users. Please contact sales for enterprise pricing."
				);
			}
			return;
		}

		setIsUpgrading(true);
		toast.loading("Creating your checkout session...");

		const result = await initiateCheckout(
			activeOrganization.id,
			selectedInterval
		);

		toast.dismiss();

		if (result.error) {
			toast.error(result.error);
		} else if (result.url) {
			toast.success("Redirecting to checkout...");
			window.location.href = result.url;
		}

		setIsUpgrading(false);
	};

	const handleManageBilling = async () => {
		if (!activeOrganization) {
			toast.error("No active organization selected");
			return;
		}

		if (!isAdmin) {
			toast.error("You do not have permission to manage billing");
			return;
		}

		toast.loading("Opening billing portal...");

		try {
			const response = await fetch("/api/billing/portal", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: activeOrganization.id,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create portal session");
			}

			const { url } = await response.json();

			if (url) {
				toast.dismiss();
				toast.success("Redirecting to billing portal...");
				window.location.href = url;
			}
		} catch (error) {
			logger.error("Error opening billing portal:", error);
			toast.dismiss();
			toast.error("Failed to open billing portal");
		}
	};

	return {
		isAdmin,
		activeOrganization,
		subscription,
		isUpgrading,
		isSyncing,
		userCount,
		recommendedPlan,
		userCountSource,
		userCountVerified,
		eligiblePlans,
		selectedInterval,
		needsUserCountSync,
		userCountLastSync,
		setIsSyncing,
		setSelectedInterval,
		handleManageBilling,
		handleSyncUserCount,
		handleUpgradeSubscription,
		handleVerifyUserCount,
	};
}
