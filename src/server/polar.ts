/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getPlanByProductId } from "@/lib/subscription-plans";

// Helper function for safe date parsing
function safeParseDate(dateString: string | null | undefined): Date | null {
	if (!dateString) return null;
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? null : date;
}

// Helper function to update organization subscription tier
async function updateOrganizationTier(organizationId: string, planId: string) {
	try {
		await prisma.organization.update({
			where: { id: organizationId },
			data: { subscriptionTier: planId },
		});
		logger.info(
			`✅ Updated organization ${organizationId} to ${planId} tier`
		);
	} catch (error) {
		logger.error("UPDATE_ORG_TIER_ERROR:", error);
		// Don't throw - this shouldn't fail the webhook
	}
}

export async function handleSubscriptionUpdated(payload: any) {
	logger.info(
		"🎯 Processing subscription created/updated: ",
		payload.data.id
	);

	// Extract organization ID from customer data
	const organizationId = payload.data.metadata?.referenceId;
	if (!organizationId) {
		logger.error("WEBHOOK_SUB_UPDATED: No referenceId found in metadata");
		return;
	}

	// Get the plan details
	const plan = getPlanByProductId(payload.data.product?.id || "");
	if (!plan) {
		logger.error(
			"WEBHOOK_SUB_UPDATED: Invalid plan ID",
			payload.data.product?.name
		);
		return;
	}

	try {
		// Find the existing local subscription for this organization
		const existingSubscription = await prisma.subscription.findUnique({
			where: { organizationId },
		});

		if (!existingSubscription) {
			logger.error(
				"WEBHOOK_SUB_UPDATED: No local subscription found for organization",
				organizationId
			);
			return;
		}

		logger.info(
			`WEBHOOK_SUB_UPDATED: Updating subscription with plan: ${plan.id}`
		);
		await prisma.subscription.update({
			where: { organizationId },
			data: {
				subscriptionId: payload.data.id,
				modifiedAt:
					safeParseDate(payload.data.modifiedAt) || new Date(),
				amount: payload.data.amount,
				currency: payload.data.currency,
				recurringInterval: payload.data.recurringInterval,
				status: payload.data.status,
				currentPeriodStart:
					safeParseDate(payload.data.currentPeriodStart) ||
					new Date(),
				currentPeriodEnd:
					safeParseDate(payload.data.currentPeriodEnd) || new Date(),
				cancelAtPeriodEnd: payload.data.cancelAtPeriodEnd || false,
				canceledAt: safeParseDate(payload.data.canceledAt),
				startedAt: safeParseDate(payload.data.startedAt) || new Date(),
				endsAt: safeParseDate(payload.data.endsAt),
				endedAt: safeParseDate(payload.data.endedAt),
				customerId: payload.data.customerId,
				productId: payload.data.productId,
				discountId: payload.data.discountId || null,
				checkoutId: payload.data.checkoutId || "",
				customerCancellationReason:
					payload.data.customerCancellationReason || null,
				customerCancellationComment:
					payload.data.customerCancellationComment || null,
				metadata: payload.data.metadata
					? JSON.stringify(payload.data.metadata)
					: null,
				customFieldData: payload.data.customFieldData
					? JSON.stringify(payload.data.customFieldData)
					: null,
			},
		});

		// Update organization subscription tier
		await updateOrganizationTier(organizationId, plan.id);

		logger.success(
			"WEBHOOK_SUB_UPDATED - Updated subscription:",
			payload.data.id
		);
	} catch (error) {
		logger.error(
			"WEBHOOK_SUB_UPDATED - Error updating subscription:",
			error
		);
		// Don't throw - let webhook succeed to avoid retries
	}
}

export async function handleSubscriptionCanceled(payload: any) {
	logger.info(
		"WEBHOOK_SUB_CANCELED - Processing subscription.canceled:",
		payload.data.id
	);

	try {
		// Extract organization ID from customer data
		const organizationId = payload.data.metadata?.referenceId;
		if (!organizationId) {
			logger.error(
				"WEBHOOK_SUB_CANCELED - No referenceId found in metadata"
			);
			return;
		}

		// Check if subscription exists
		const existingSubscription = await prisma.subscription.findUnique({
			where: { organizationId },
		});

		if (!existingSubscription) {
			logger.warn("⚠️ Subscription not found for cancellation");
			return;
		}

		await prisma.subscription.update({
			where: { organizationId },
			data: {
				subscriptionId: payload.data.id,
				modifiedAt: new Date(),
				status: "canceled",
				cancelAtPeriodEnd: true,
				canceledAt:
					safeParseDate(payload.data.canceledAt) || new Date(),
				customerCancellationReason:
					payload.data.customerCancellationReason || null,
				customerCancellationComment:
					payload.data.customerCancellationComment || null,
				// Update other fields that might have changed
				currentPeriodEnd:
					safeParseDate(payload.data.currentPeriodEnd) || new Date(),
				endsAt: safeParseDate(payload.data.endsAt),
				endedAt: safeParseDate(payload.data.endedAt),
			},
		});

		// When subscription is canceled, keep tier until period ends
		// Only downgrade to free if cancelAtPeriodEnd and period has ended
		if (payload.data.endedAt) {
			await updateOrganizationTier(organizationId, "free");
		}

		logger.success(
			"WEBHOOK_SUB_CANCELED - Canceled subscription:",
			payload.data.id
		);
	} catch (error) {
		logger.error(
			"WEBHOOK_SUB_CANCELED - Error canceling subscription:",
			error
		);
		// Don't throw - let webhook succeed to avoid retries
	}
}

export async function handleSubscriptionRevoked(payload: any) {
	logger.info(
		"WEBHOOK_SUB_REVOKED - Processing subscription.revoked:",
		payload.data.id
	);

	try {
		const organizationId = payload.data.metadata?.referenceId;
		if (!organizationId) {
			logger.error(
				"WEBHOOK_SUB_REVOKED - No referenceId found in metadata"
			);
			return;
		}
		// Check if subscription exists
		const existingSubscription = await prisma.subscription.findUnique({
			where: { organizationId },
		});

		if (!existingSubscription) {
			logger.warn(
				"WEBHOOK_SUB_REVOKED - Subscription not found for revocation"
			);
			return;
		}

		await prisma.subscription.update({
			where: { organizationId },
			data: {
				modifiedAt: new Date(),
				status: "revoked",
				cancelAtPeriodEnd: true,
				canceledAt:
					safeParseDate(payload.data.canceledAt) || new Date(),
				endedAt: new Date(),
				customerCancellationReason:
					payload.data.customerCancellationReason || "revoked",
			},
		});

		// Immediately downgrade to free tier when revoked
		await updateOrganizationTier(organizationId, "free");

		logger.success(
			"WEBHOOK_SUB_REVOKED - Revoked subscription:",
			payload.data.id
		);
	} catch (error) {
		logger.error(
			"WEBHOOK_SUB_REVOKED - Error revoking subscription:",
			error
		);
		// Don't throw - let webhook succeed to avoid retries
	}
}

export async function handleSubscriptionUncanceled(payload: any) {
	logger.info(
		"WEBHOOK_SUB_UNCANCELED - Processing subscription.uncanceled:",
		payload.data.id
	);

	try {
		const organizationId = payload.data.metadata?.referenceId;
		if (!organizationId) {
			logger.error(
				"WEBHOOK_SUB_UNCANCELED - No referenceId found in metadata"
			);
			return;
		}

		// Get the plan details to restore the tier
		const plan = getPlanByProductId(payload.data.product?.id || "");
		if (!plan) {
			logger.error(
				"WEBHOOK_SUB_UNCANCELED - Invalid plan ID: ",
				payload.data.product?.name
			);
			return;
		}

		// Check if subscription exists
		const existingSubscription = await prisma.subscription.findUnique({
			where: { organizationId },
		});

		if (!existingSubscription) {
			logger.info(
				"WEBHOOK_SUB_UNCANCELED - Subscription not found for uncancellation"
			);
			return;
		}

		await prisma.subscription.update({
			where: { organizationId },
			data: {
				modifiedAt: new Date(),
				status: payload.data.status,
				cancelAtPeriodEnd: false,
				canceledAt: null,
				endedAt: null,
				customerCancellationReason: null,
				customerCancellationComment: null,
				// Update period information
				currentPeriodStart:
					safeParseDate(payload.data.currentPeriodStart) ||
					new Date(),
				currentPeriodEnd:
					safeParseDate(payload.data.currentPeriodEnd) || new Date(),
			},
		});

		// Restore organization tier when uncanceled
		await updateOrganizationTier(organizationId, plan.id);

		logger.success(
			"WEBHOOK_SUB_UNCANCELED - Uncanceled subscription:",
			payload.data.id
		);
	} catch (error) {
		logger.error(
			"WEBHOOK_SUB_UNCANCELED - Error uncanceling subscription:",
			error
		);
		// Don't throw - let webhook succeed to avoid retries
	}
}

export async function handleSubscriptionActive(payload: any) {
	logger.info(
		"WEBHOOK_SUB_ACTIVE - Processing subscription.active:",
		payload.data.id
	);

	const organizationId = payload.data.metadata?.referenceId;
	if (!organizationId) {
		logger.error("WEBHOOK_SUB_ACTIVE - No referenceId found in metadata");
		return;
	}

	// Get the plan details for the activated subscription
	const plan = getPlanByProductId(payload.data.product?.id || "");
	if (!plan) {
		logger.error(
			"WEBHOOK_SUB_ACTIVE - Invalid plan ID: ",
			payload.data.product?.name
		);
		return;
	}

	try {
		// Check if subscription exists
		const existingSubscription = await prisma.subscription.findUnique({
			where: { organizationId },
		});

		if (!existingSubscription) {
			logger.warn(
				"WEBHOOK_SUB_ACTIVE - Subscription not found, creating new one"
			);
			return;
		}

		await prisma.subscription.update({
			where: { organizationId },
			data: {
				modifiedAt: new Date(),
				status: "active",
				currentPeriodStart:
					safeParseDate(payload.data.currentPeriodStart) ||
					new Date(),
				currentPeriodEnd:
					safeParseDate(payload.data.currentPeriodEnd) || new Date(),
				startedAt: safeParseDate(payload.data.startedAt) || new Date(),
			},
		});

		// Update organization tier when subscription becomes active
		await updateOrganizationTier(organizationId, plan.id);

		logger.success(
			"WEBHOOK_SUB_ACTIVE - Activated subscription:",
			payload.data.id
		);
	} catch (error) {
		logger.error(
			"WEBHOOK_SUB_ACTIVE - Error activating subscription:",
			error
		);
		// Don't throw - let webhook succeed to avoid retries
	}
}

// Main webhook handler
export async function handleSubscriptionWebhook(payload: any) {
	const { type } = payload;

	switch (type) {
		case "subscription.created":
			return handleSubscriptionUpdated(payload);

		case "subscription.updated":
			return handleSubscriptionUpdated(payload);

		case "subscription.canceled":
			return handleSubscriptionCanceled(payload);

		case "subscription.revoked":
			return handleSubscriptionRevoked(payload);

		case "subscription.uncanceled":
			return handleSubscriptionUncanceled(payload);

		case "subscription.active":
			return handleSubscriptionActive(payload);

		default:
			logger.warn(
				`🤷WEBHOOK_SUB_UNHANDLED - Unhandled subscription event: ${type}`
			);
	}
}
