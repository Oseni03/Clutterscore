import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const integrations = await prisma.toolIntegration.findMany({
				where: {
					organizationId: user.organizationId,
					isActive: true,
				},
				select: {
					source: true,
					syncStatus: true,
					lastSyncedAt: true,
					lastError: true,
				},
			});

			const status = {
				total: integrations.length,
				syncing: integrations.filter((i) => i.syncStatus === "SYNCING")
					.length,
				error: integrations.filter((i) => i.syncStatus === "ERROR")
					.length,
				idle: integrations.filter((i) => i.syncStatus === "IDLE")
					.length,
				integrations: integrations.map((i) => ({
					source: i.source,
					status: i.syncStatus,
					lastSynced: i.lastSyncedAt,
					error: i.lastError,
				})),
			};

			return NextResponse.json({ success: true, status });
		} catch (error) {
			logger.error("Failed to fetch status:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
