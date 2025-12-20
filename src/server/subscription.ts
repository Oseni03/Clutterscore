"use server";

import { prisma } from "@/lib/prisma";
import { FREE_PLAN } from "@/lib/subscription-plans";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import {
	canUpgradeToPlan,
	getEligibleProductIds,
	type BillingInterval,
} from "@/lib/subscription-plans";
import { logger } from "@/lib/logger";
import { UserCountService } from "./user-count-service";

export async function createFreeSubscription(organizationId: string) {
	const freePlan = FREE_PLAN;
	if (!freePlan) throw new Error("Free plan not found in subscription plans");

	const now = new Date();
	const currentPeriodEnd = new Date();
	currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);

	await prisma.subscription.create({
		data: {
			organizationId,
			status: "active",
			amount: 0,
			currency: "USD",
			recurringInterval: "yearly",
			currentPeriodStart: now,
			currentPeriodEnd,
			cancelAtPeriodEnd: false,
			startedAt: now,
			customerId: `free_${organizationId}`,
			productId:
				freePlan.plans.yearly.productId || `free_${organizationId}`,
			checkoutId: `free_${organizationId}`,
			createdAt: now,
		},
	});
}

export async function syncUserCount(organizationId: string) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return { error: "Unauthorized", userCount: null, source: null };
		}

		const result = await UserCountService.syncUserCount(organizationId);

		return {
			error: null,
			userCount: result.userCount,
			source: result.source,
		};
	} catch (error) {
		logger.error("Failed to sync user count:", error);
		return {
			error: (error as Error).message || "Failed to sync user count",
			userCount: null,
			source: null,
		};
	}
}

export async function verifyUserCount(
	organizationId: string,
	userCount: number
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return { error: "Unauthorized", success: false };
		}

		await UserCountService.verifyUserCount(organizationId, userCount);

		return { error: null, success: true };
	} catch (error) {
		logger.error("Failed to verify user count:", error);
		return { error: (error as Error).message, success: false };
	}
}

export async function initiateCheckout(
	organizationId: string,
	interval: BillingInterval
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return { error: "Unauthorized", url: null };
		}

		// Get organization with user count
		const userCountData =
			await UserCountService.getUserCount(organizationId);

		const { userCount } = userCountData;

		// Validate user count
		if (!userCount || userCount === 0) {
			return {
				error: "Please connect an integration (Google, Dropbox, or Slack) to detect your user count before upgrading",
				url: null,
			};
		}

		if (userCount < 350) {
			return {
				error: "Your organization has fewer than 350 users. Please stay on the Free plan or contact sales.",
				url: null,
			};
		}

		if (userCount > 2000) {
			return {
				error: "Your organization exceeds 2,000 users. Please contact sales for enterprise pricing.",
				url: null,
			};
		}

		// Get eligible product IDs
		const productIds = getEligibleProductIds(userCount, interval);

		if (productIds.length === 0) {
			return {
				error: "No eligible plans found for your organization size",
				url: null,
			};
		}

		// Create checkout session
		const { data, error } = await authClient.checkout({
			products: productIds,
			referenceId: organizationId,
			allowDiscountCodes: false,
		});

		if (error) {
			logger.error("Checkout error:", error);
			return { error: error.message, url: null };
		}

		return { error: null, url: data?.url || null };
	} catch (error) {
		logger.error("Failed to initiate checkout:", error);
		return {
			error:
				(error as Error).message || "Failed to create checkout session",
			url: null,
		};
	}
}
