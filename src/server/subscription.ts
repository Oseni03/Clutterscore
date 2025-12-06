"use server";

import { prisma } from "@/lib/prisma";
import { FREE_PLAN } from "@/lib/utils";

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
