// app/api/integrations/user-count/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware";
import { UserCountService } from "@/server/user-count-service";
import { logger } from "@/lib/logger";

/**
 * GET: Fetch cached or synced user count
 */
export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		const { searchParams } = new URL(req.url);
		const forceSync = searchParams.get("forceSync") === "true";

		try {
			const result = await UserCountService.getUserCount(
				user.organizationId,
				forceSync
			);

			return NextResponse.json(result);
		} catch (error) {
			logger.error("Failed to get user count:", error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to fetch user count",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * POST: Manually verify/set user count
 */
export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		const { userCount } = await req.json();

		if (!userCount || typeof userCount !== "number" || userCount < 0) {
			return NextResponse.json(
				{ error: "Invalid user count" },
				{ status: 400 }
			);
		}

		try {
			await UserCountService.verifyUserCount(
				user.organizationId,
				userCount
			);
			return NextResponse.json({ success: true, userCount });
		} catch (error) {
			logger.error("Failed to verify user count:", error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to verify user count",
				},
				{ status: 500 }
			);
		}
	});
}
