import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "50");
			const action = searchParams.get("action");

			const skip = (page - 1) * limit;

			const [activities, total] = await Promise.all([
				prisma.activity.findMany({
					where: {
						organizationId: user.organizationId,
						...(action && { action }),
					},
					include: {
						user: {
							select: {
								name: true,
								email: true,
							},
						},
					},
					orderBy: {
						createdAt: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.activity.count({
					where: {
						organizationId: user.organizationId,
						...(action && { action }),
					},
				}),
			]);

			return NextResponse.json({
				success: true,
				activities,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("Failed to fetch activities:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
