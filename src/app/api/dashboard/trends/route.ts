import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { subMonths, format } from "date-fns";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = new URL(req.url);
			const months = parseInt(searchParams.get("months") || "6", 10);

			// Get score trends for the last N months
			const startDate = subMonths(new Date(), months);

			const trends = await prisma.scoreTrend.findMany({
				where: {
					organizationId: user.organizationId,
					recordedAt: { gte: startDate },
				},
				orderBy: { recordedAt: "asc" },
			});

			// If no trends exist, generate from audit results
			if (trends.length === 0) {
				const audits = await prisma.auditResult.findMany({
					where: {
						organizationId: user.organizationId,
						auditedAt: { gte: startDate },
					},
					orderBy: { auditedAt: "asc" },
				});

				const trendData = audits.map((audit) => ({
					month: format(audit.auditedAt, "yyyy-MM"),
					score: audit.score,
					waste: audit.estimatedSavings,
					riskScore: Math.round((audit.activeRisks / 100) * 100), // Normalize
					activeUsers: null,
					storageUsedGb: audit.storageWaste / 1024, // Convert MB to GB
					licenseCount: null,
					recordedAt: audit.auditedAt,
				}));

				return NextResponse.json({
					trends: trendData,
					source: "audits",
				});
			}

			return NextResponse.json({ trends, source: "scoreTrends" });
		} catch (error) {
			logger.error("Trends error:", error);
			return NextResponse.json(
				{ error: "Failed to fetch score trends" },
				{ status: 500 }
			);
		}
	});
}
