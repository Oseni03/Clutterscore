import { prisma } from "@/lib/prisma";
import { startOfMonth, isAfter } from "date-fns";

export async function canRunFreeAudit(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	resetDate?: Date;
}> {
	const org = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: {
			subscriptionTier: true,
			lastFreeAuditDate: true,
			freeAuditsThisMonth: true,
			freeAuditResetDate: true,
		},
	});

	if (!org) {
		return { allowed: false, reason: "Organization not found" };
	}

	// If not free tier, allow unlimited audits
	if (org.subscriptionTier !== "free") {
		return { allowed: true };
	}

	const now = new Date();
	const currentMonthStart = startOfMonth(now);

	// Reset counter if we're in a new month
	if (
		!org.freeAuditResetDate ||
		isAfter(currentMonthStart, org.freeAuditResetDate)
	) {
		await prisma.organization.update({
			where: { id: organizationId },
			data: {
				freeAuditsThisMonth: 0,
				freeAuditResetDate: currentMonthStart,
			},
		});

		return { allowed: true };
	}

	// Check if monthly limit exceeded
	if (org.freeAuditsThisMonth >= 1) {
		const nextMonth = new Date(currentMonthStart);
		nextMonth.setMonth(nextMonth.getMonth() + 1);

		return {
			allowed: false,
			reason: "Monthly audit limit reached (1/1 used)",
			resetDate: nextMonth,
		};
	}

	return { allowed: true };
}

export async function incrementFreeAuditCount(
	organizationId: string
): Promise<void> {
	await prisma.organization.update({
		where: { id: organizationId },
		data: {
			freeAuditsThisMonth: { increment: 1 },
			lastFreeAuditDate: new Date(),
		},
	});
}
