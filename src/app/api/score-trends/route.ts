import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const months = parseInt(searchParams.get("months") || "12");

			// Calculate date range
			const endDate = new Date();
			const startDate = new Date();
			startDate.setMonth(startDate.getMonth() - months);

			const trends = await prisma.scoreTrend.findMany({
				where: {
					organizationId: user.organizationId,
					recordedAt: {
						gte: startDate,
						lte: endDate,
					},
				},
				orderBy: {
					month: "asc",
				},
			});

			return NextResponse.json({ success: true, trends });
		} catch (error) {
			console.error("Failed to fetch score trends:", error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
