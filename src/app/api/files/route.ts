import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { FileStatus, FileType, ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = req.nextUrl;
			const page = parseInt(searchParams.get("page") || "1");
			const limit = parseInt(searchParams.get("limit") || "100");
			const source = searchParams.get("source");
			const type = searchParams.get("type");
			const search = searchParams.get("search")?.trim();
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
					stats: {
						totalFiles: 0,
						totalSizeMb: 0,
						duplicatesCount: 0,
						publicFilesCount: 0,
					},
				});
			}

			const auditWhere = {
				auditResultId: latestAudit.id,
				status: FileStatus.ACTIVE,
			};
			const filteredWhere = {
				...auditWhere,
				...(source && { source: source as ToolSource }),
				...(type && { type: type as FileType }),
				...(search && {
					OR: [
						{
							name: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
						{
							path: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
						{
							ownerEmail: {
								contains: search,
								mode: "insensitive" as const,
							},
						},
					],
				}),
				...(isDuplicate !== null && {
					isDuplicate: isDuplicate === "true",
				}),
				...(isPubliclyShared !== null && {
					isPubliclyShared: isPubliclyShared === "true",
				}),
			};

			const [
				files,
				total,
				totalFiles,
				sizeAggregate,
				duplicatesCount,
				publicFilesCount,
			] = await Promise.all([
				prisma.file.findMany({
					where: filteredWhere,
					orderBy: {
						sizeMb: "desc",
					},
					skip,
					take: limit,
				}),
				prisma.file.count({
					where: filteredWhere,
				}),
				prisma.file.count({
					where: auditWhere,
				}),
				prisma.file.aggregate({
					where: auditWhere,
					_sum: { sizeMb: true },
				}),
				prisma.file.count({
					where: {
						...auditWhere,
						isDuplicate: true,
					},
				}),
				prisma.file.count({
					where: {
						...auditWhere,
						isPubliclyShared: true,
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
				stats: {
					totalFiles,
					totalSizeMb: sizeAggregate._sum.sizeMb ?? 0,
					duplicatesCount,
					publicFilesCount,
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
