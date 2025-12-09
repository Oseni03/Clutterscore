import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { PlaybookStatus, ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const status = searchParams.get("status");
			const source = searchParams.get("source");

			const playbooks = await prisma.playbook.findMany({
				where: {
					organizationId: user.organizationId,
					...(status && { status: status as PlaybookStatus }),
					...(source && { source: source as ToolSource }),
				},
				include: {
					_count: {
						select: {
							items: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				take: 50,
			});

			return NextResponse.json({ success: true, playbooks });
		} catch (error) {
			logger.error("FETCH_PLAYBOOKS_ERROR:", error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
