import { logger } from "@/lib/logger";
import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
	return withAuth(request, async (req, user) => {
		try {
			await prisma.notification.updateMany({
				where: { userId: user.id, read: false },
				data: { read: true },
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			logger.error("Error marking all as read:", error);
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 }
			);
		}
	});
}
