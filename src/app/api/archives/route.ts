import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { ArchiveStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = new URL(req.url);
			const status = searchParams.get("status") || "ARCHIVED";

			const archives = await prisma.archivedFile.findMany({
				where: {
					organizationId: user.organizationId,
					status:
						status === "all"
							? undefined
							: (status as ArchiveStatus),
				},
				orderBy: { archivedAt: "desc" },
			});

			return NextResponse.json({ archives });
		} catch (error) {
			logger.error("GET_ARCHIVES_ERROR: ", error);
			return NextResponse.json(
				{ error: "Failed to fetch archives" },
				{ status: 500 }
			);
		}
	});
}
