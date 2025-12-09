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

			// Find largest waster by type
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

			const largestType = Object.entries(typeGroups).sort(
				([, a], [, b]) => b.sizeMb - a.sizeMb
			)[0];

			// Calculate distribution
			const totalSize = Object.values(typeGroups).reduce(
				(sum, g) => sum + g.sizeMb,
				0
			);

			const distribution = Object.entries(typeGroups)
				.map(([type, data]) => ({
					name: type.charAt(0) + type.slice(1).toLowerCase(),
					value: Math.round((data.sizeMb / totalSize) * 100),
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
			const totalQuotaGb = Math.ceil(totalUsedGb * 1.2); // 20% buffer

			const analytics = {
				stats: {
					totalUsedGb,
					totalQuotaGb,
					wastedStorageGb,
					estimatedMonthlyCost,
					largestWaster: {
						type: largestType ? largestType[0] : "Unknown",
						sizeGb: largestType ? largestType[1].sizeMb / 1024 : 0,
						location: "Multiple folders",
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
