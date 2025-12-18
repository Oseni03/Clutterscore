// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

const ITEMS_PER_PAGE = 20;

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const url = new URL(req.url);
			const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
			const skip = (page - 1) * ITEMS_PER_PAGE;

			const [notifications, totalCount] = await Promise.all([
				prisma.notification.findMany({
					where: { userId: user.id },
					orderBy: { createdAt: "desc" },
					take: ITEMS_PER_PAGE,
					skip,
				}),
				prisma.notification.count({
					where: { userId: user.id },
				}),
			]);

			const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

			return NextResponse.json({
				notifications,
				pagination: {
					page,
					totalPages,
					totalCount,
					hasNext: page < totalPages,
					hasPrev: page > 1,
				},
			});
		} catch (error) {
			logger.error("Error fetching notifications:", error);
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 }
			);
		}
	});
}
