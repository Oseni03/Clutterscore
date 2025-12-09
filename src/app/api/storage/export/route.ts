import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
			});

			if (!latestAudit) {
				return NextResponse.json(
					{ error: "No audit results found" },
					{ status: 404 }
				);
			}

			// Fetch files
			const files = await prisma.file.findMany({
				where: {
					auditResultId: latestAudit.id,
					status: "ACTIVE",
				},
				orderBy: {
					sizeMb: "desc",
				},
			});

			// Calculate statistics
			const totalUsedGb =
				files.reduce((sum, f) => sum + f.sizeMb, 0) / 1024;
			const wastedFiles = files.filter(
				(f) =>
					f.isDuplicate ||
					(f.lastAccessed &&
						f.lastAccessed <
							new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
			);
			const wastedStorageGb =
				wastedFiles.reduce((sum, f) => sum + f.sizeMb, 0) / 1024;

			// Generate CSV
			const headers = [
				"Name",
				"Size (MB)",
				"Type",
				"Source",
				"Path",
				"Last Accessed",
				"Owner",
				"Is Duplicate",
				"Is Public",
				"Status",
			];

			const summary = [
				["STORAGE SUMMARY"],
				["Total Storage Used", `${totalUsedGb.toFixed(2)} GB`],
				["Wasted Storage", `${wastedStorageGb.toFixed(2)} GB`],
				[
					"Estimated Monthly Cost",
					`$${(wastedStorageGb * 0.1).toFixed(2)}`,
				],
				["Total Files", files.length.toString()],
				["Wasted Files", wastedFiles.length.toString()],
				[],
				["FILE DETAILS"],
			];

			const rows = files.map((file) => [
				file.name,
				file.sizeMb.toString(),
				file.type,
				file.source,
				file.path || "",
				file.lastAccessed?.toISOString() || "Never",
				file.ownerEmail || "",
				file.isDuplicate ? "Yes" : "No",
				file.isPubliclyShared ? "Yes" : "No",
				file.status,
			]);

			const csv = [
				...summary.map((row) => row.join(",")),
				headers.join(","),
				...rows.map((row) =>
					row
						.map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
						.join(",")
				),
			].join("\n");

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "storage.exported",
					metadata: {
						totalFiles: files.length,
						totalStorageGb: totalUsedGb,
					},
				},
			});

			return new NextResponse(csv, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="storage-report-${new Date().toISOString().split("T")[0]}.csv"`,
				},
			});
		} catch (error) {
			logger.error("Failed to export storage report:", error as Error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to export storage report",
				},
				{ status: 500 }
			);
		}
	});
}
