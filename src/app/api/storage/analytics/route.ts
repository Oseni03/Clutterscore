import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FileType } from "@prisma/client";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
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
					storageWaste: true,
				},
			});

			if (!latestAudit) {
				return NextResponse.json(
					{ error: "No audit results found" },
					{ status: 404 }
				);
			}

			// Fetch all files
			const files = await prisma.file.findMany({
				where: {
					auditResultId: latestAudit.id,
					status: "ACTIVE",
				},
			});

			// Calculate total storage
			const totalUsedMb = files.reduce((sum, f) => sum + f.sizeMb, 0);
			const totalUsedGb = totalUsedMb / 1024;

			// Calculate wasted storage (old files + duplicates)
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			const wastedFiles = files.filter(
				(f) =>
					f.isDuplicate ||
					(f.lastAccessed && f.lastAccessed < oneYearAgo)
			);

			const wastedStorageMb = wastedFiles.reduce(
				(sum, f) => sum + f.sizeMb,
				0
			);
			const wastedStorageGb = wastedStorageMb / 1024;

			// Calculate estimated cost ($0.10 per GB per month)
			const estimatedMonthlyCost = wastedStorageGb * 0.1;

			// Group all files by type
			const typeGroups = files.reduce(
				(acc, file) => {
					const type = file.type;
					if (!acc[type]) {
						acc[type] = { sizeMb: 0, count: 0 };
					}
					acc[type].sizeMb += file.sizeMb;
					acc[type].count += 1;
					return acc;
				},
				{} as Record<FileType, { sizeMb: number; count: number }>
			);

			// Find the largest waster among wasted files, then fall back to
			// the largest type overall when nothing is considered waste.
			const wastedTypeGroups = wastedFiles.reduce(
				(acc, file) => {
					acc[file.type] = (acc[file.type] ?? 0) + file.sizeMb;
					return acc;
				},
				{} as Partial<Record<FileType, number>>
			);

			const wastedTypeEntries = Object.entries(wastedTypeGroups) as [
				FileType,
				number,
			][];
			const typeEntries = Object.entries(typeGroups) as [
				FileType,
				{ sizeMb: number; count: number },
			][];

			const largestWastedType = wastedTypeEntries.sort(
				([, a], [, b]) => b - a
			)[0];
			const largestOverallType = typeEntries.sort(
				([, a], [, b]) => b.sizeMb - a.sizeMb
			)[0];

			const largestTypeKey =
				largestWastedType?.[0] ?? largestOverallType?.[0];
			const largestWasterSize =
				largestWastedType?.[1] ?? largestOverallType?.[1].sizeMb ?? 0;
			const largestTypeFiles = largestTypeKey
				? files.filter((file) => file.type === largestTypeKey)
				: [];

			const sourceGroups = largestTypeFiles.reduce(
				(acc, file) => {
					acc[file.source] = (acc[file.source] ?? 0) + file.sizeMb;
					return acc;
				},
				{} as Partial<Record<string, number>>
			);

			const largestSource = (
				Object.entries(sourceGroups) as [string, number][]
			).sort(([, a], [, b]) => b - a)[0]?.[0];

			// Calculate distribution
			const totalSize = Object.values(typeGroups).reduce(
				(sum, g) => sum + g.sizeMb,
				0
			);

			const distribution = Object.entries(typeGroups)
				.map(([type, data]) => ({
					name: type.charAt(0) + type.slice(1).toLowerCase(),
					value:
						totalSize > 0
							? Math.round((data.sizeMb / totalSize) * 100)
							: 0,
					sizeGb: data.sizeMb / 1024,
				}))
				.sort((a, b) => b.sizeGb - a.sizeGb);

			// Get large unused files
			const largeFiles = files
				.filter(
					(f) =>
						f.lastAccessed &&
						f.lastAccessed < oneYearAgo &&
						f.sizeMb > 100 // > 100 MB
				)
				.sort((a, b) => b.sizeMb - a.sizeMb)
				.slice(0, 10);

			// Estimate quota (you might want to get this from organization settings)
			const totalQuotaGb =
				totalUsedGb > 0 ? Math.max(Math.ceil(totalUsedGb * 1.2), 1) : 0;

			const analytics = {
				stats: {
					totalUsedGb,
					totalQuotaGb,
					wastedStorageGb,
					estimatedMonthlyCost,
					duplicateCount: files.filter((f) => f.isDuplicate).length,
					publicCount: files.filter((f) => f.isPubliclyShared).length,
					largestWaster: {
						type: largestTypeKey
							? largestTypeKey.charAt(0) +
								largestTypeKey.slice(1).toLowerCase()
							: "Unknown",
						sizeGb: largestWasterSize / 1024,
						source: largestSource ?? null,
					},
				},
				distribution,
				largeFiles,
			};

			return NextResponse.json(analytics);
		} catch (error) {
			logger.error("Failed to fetch storage analytics:", error as Error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to fetch storage analytics",
				},
				{ status: 500 }
			);
		}
	});
}
