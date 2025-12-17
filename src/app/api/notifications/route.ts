// app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const notifications = await prisma.notification.findMany({
				where: { userId: user.id },
				orderBy: { createdAt: "desc" },
				take: 50, // limit for performance – use pagination later if needed
			});

			return NextResponse.json(notifications);
		} catch (error) {
			logger.error("Error fetching notifications:", error);
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 }
			);
		}
	});
}
