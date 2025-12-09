import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "100");
			const source = searchParams.get("source");
			const isDuplicate = searchParams.get("isDuplicate");
			const isPubliclyShared = searchParams.get("isPubliclyShared");

			const skip = (page - 1) * limit;

			// Get latest audit result
			const latestAudit = await prisma.auditResult.findFirst({
				where: {
					organizationId: user.organizationId,
				},
				orderBy: {
					auditedAt: "desc",
				},
				select: {
					id: true,
				},
			});

			if (!latestAudit) {
				return NextResponse.json({
					success: true,
					files: [],
					pagination: { page, limit, total: 0, totalPages: 0 },
				});
			}

			const [files, total] = await Promise.all([
				prisma.file.findMany({
					where: {
						auditResultId: latestAudit.id,
						...(source && { source: source as ToolSource }),
						...(isDuplicate !== null && {
							isDuplicate: isDuplicate === "true",
						}),
						...(isPubliclyShared !== null && {
							isPubliclyShared: isPubliclyShared === "true",
						}),
					},
					orderBy: {
						sizeMb: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.file.count({
					where: {
						auditResultId: latestAudit.id,
						...(source && { source: source as ToolSource }),
						...(isDuplicate !== null && {
							isDuplicate: isDuplicate === "true",
						}),
						...(isPubliclyShared !== null && {
							isPubliclyShared: isPubliclyShared === "true",
						}),
					},
				}),
			]);

			return NextResponse.json({
				success: true,
				files,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("Failed to fetch files:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
