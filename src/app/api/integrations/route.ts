import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const integrations = await prisma.toolIntegration.findMany({
				where: {
					organizationId: user.organizationId,
				},
				select: {
					id: true,
					source: true,
					isActive: true,
					connectedAt: true,
					lastSyncedAt: true,
					syncStatus: true,
					lastError: true,
					lastErrorAt: true,
					scopes: true,
					metadata: true,
				},
				orderBy: {
					connectedAt: "desc",
				},
			});

			return NextResponse.json({ success: true, integrations });
		} catch (error) {
			console.error("Failed to fetch integrations:", error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
