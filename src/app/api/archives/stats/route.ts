import { NextRequest, NextResponse } from "next/server";
import { ArchiveService } from "@/server/archive-service";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const archiveService = new ArchiveService();
			const stats = await archiveService.getArchiveStats(
				user.organizationId
			);

			return NextResponse.json(stats);
		} catch (error) {
			logger.error("ARCHIVE_STATS_ERROR: ", error);
			return NextResponse.json(
				{ error: "Failed to fetch stats" },
				{ status: 500 }
			);
		}
	});
}
