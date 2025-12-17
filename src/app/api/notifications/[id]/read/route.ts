// app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	return withAuth(request, async (req, user) => {
		const { id } = await params;

		try {
			const notification = await prisma.notification.findUnique({
				where: { id },
			});

			if (!notification) {
				return NextResponse.json(
					{ error: "Notification not found" },
					{ status: 404 }
				);
			}

			if (notification.userId !== user.id) {
				return NextResponse.json(
					{ error: "Forbidden" },
					{ status: 403 }
				);
			}

			if (notification.read) {
				return NextResponse.json({ success: true }); // already read – idempotent
			}

			await prisma.notification.update({
				where: { id },
				data: { read: true },
			});

			return NextResponse.json({ success: true });
		} catch (error) {
			logger.error("Error marking notification as read:", error);
			return NextResponse.json(
				{ error: "Internal server error" },
				{ status: 500 }
			);
		}
	});
}
