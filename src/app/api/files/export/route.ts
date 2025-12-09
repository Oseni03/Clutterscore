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
				select: {
					id: true,
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
				orderBy: {
					sizeMb: "desc",
				},
			});

			// Generate CSV
			const headers = [
				"Name",
				"Size (MB)",
				"Type",
				"Source",
				"Path",
				"Last Accessed",
				"Owner",
				"Public",
				"Duplicate",
			];

			const rows = files.map((file) => [
				file.name,
				file.sizeMb.toString(),
				file.type,
				file.source,
				file.path || "",
				file.lastAccessed?.toISOString() || "",
				file.ownerEmail || "",
				file.isPubliclyShared ? "Yes" : "No",
				file.isDuplicate ? "Yes" : "No",
			]);

			const csv = [
				headers.join(","),
				...rows.map((row) =>
					row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
				),
			].join("\n");

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "files.exported",
					metadata: {
						count: files.length,
					},
				},
			});

			return new NextResponse(csv, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="files-export-${new Date().toISOString().split("T")[0]}.csv"`,
				},
			});
		} catch (error) {
			logger.error("Failed to export files:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message || "Failed to export files" },
				{ status: 500 }
			);
		}
	});
}
