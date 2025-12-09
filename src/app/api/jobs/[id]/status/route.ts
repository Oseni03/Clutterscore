import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	return withAuth(req, async (req, user) => {
		try {
			// In production, query Inngest API for job status
			// For now, check database for completion markers

			// Check if audit completed
			const auditResult = await prisma.auditResult.findFirst({
				where: {
					organizationId: user.organizationId,
				},
				orderBy: {
					auditedAt: "desc",
				},
				take: 1,
			});

			// Check if playbook executed
			const playbook = await prisma.playbook.findFirst({
				where: {
					organizationId: user.organizationId,
					status: { in: ["EXECUTED", "FAILED"] },
				},
				orderBy: {
					executedAt: "desc",
				},
				take: 1,
			});

			// Simple heuristic: if we have recent data, job likely completed
			const now = Date.now();
			const fiveMinutesAgo = now - 5 * 60 * 1000;

			const isAuditRecent =
				auditResult &&
				new Date(auditResult.auditedAt).getTime() > fiveMinutesAgo;
			const isPlaybookRecent =
				playbook &&
				playbook.executedAt &&
				new Date(playbook.executedAt).getTime() > fiveMinutesAgo;

			if (isAuditRecent || isPlaybookRecent) {
				return NextResponse.json({
					status: "completed",
					jobId: id,
				});
			}

			return NextResponse.json({
				status: "running",
				jobId: id,
			});
		} catch (error) {
			logger.error("Failed to check job status:", error as Error);
			return NextResponse.json(
				{ error: "Failed to check status" },
				{ status: 500 }
			);
		}
	});
}
