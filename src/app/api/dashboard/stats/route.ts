// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { startOfMonth } from "date-fns";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Get latest audit result for Clutterscore
			const latestAudit = await prisma.auditResult.findFirst({
				where: { organizationId: user.organizationId },
				orderBy: { auditedAt: "desc" },
			});

			// Calculate total savings this month
			const startOfCurrentMonth = startOfMonth(new Date());
			const executedPlaybooks = await prisma.playbook.findMany({
				where: {
					organizationId: user.organizationId,
					status: "EXECUTED",
					executedAt: { gte: startOfCurrentMonth },
				},
				select: { actualSavings: true },
			});

			const monthlySavings = executedPlaybooks.reduce(
				(sum, pb) => sum + (pb.actualSavings || 0),
				0
			);

			// Get next scan date (30 days from last audit)
			const nextScanDate = latestAudit
				? new Date(
						latestAudit.auditedAt.getTime() +
							30 * 24 * 60 * 60 * 1000
					)
				: null;

			// Get active risks
			const activeRisks = latestAudit?.activeRisks || 0;
			const criticalRisks = latestAudit?.criticalRisks || 0;

			// Get pending playbooks count
			const pendingPlaybooks = await prisma.playbook.count({
				where: {
					organizationId: user.organizationId,
					status: "PENDING",
				},
			});

			// Get subscription info
			const organization = await prisma.organization.findUnique({
				where: { id: user.organizationId },
				select: {
					subscriptionTier: true,
					targetScore: true,
				},
			});

			const isFreeTier = organization?.subscriptionTier === "FREE";
			const canRunAudit =
				!isFreeTier ||
				!latestAudit ||
				(nextScanDate && nextScanDate <= new Date());

			return NextResponse.json({
				clutterscore: latestAudit?.score || 0,
				lastAuditDate: latestAudit?.auditedAt || null,
				nextScanDate,
				monthlySavings: Math.round(monthlySavings),
				estimatedAnnualSavings: latestAudit?.estimatedSavings || 0,
				activeRisks,
				criticalRisks,
				pendingPlaybooks,
				subscriptionTier: organization?.subscriptionTier || "FREE",
				targetScore: organization?.targetScore || 85,
				isFreeTier,
				canRunAudit,
			});
		} catch (error) {
			logger.error("Dashboard stats error:", error);
			return NextResponse.json(
				{ error: "Failed to fetch dashboard statistics" },
				{ status: 500 }
			);
		}
	});
}
