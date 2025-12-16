import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Fetch all audit logs for the organization
			const logs = await prisma.auditLog.findMany({
				where: {
					organizationId: user.organizationId,
				},
				orderBy: { timestamp: "desc" },
				include: {
					user: {
						select: {
							name: true,
							email: true,
						},
					},
					playbook: {
						select: { title: true },
					},
				},
			});

			// Create CSV content
			const headers = [
				"Timestamp",
				"Action Type",
				"Target",
				"Target Type",
				"Executor",
				"Status",
				"Playbook",
				"Can Undo",
				"Undo Expires At",
				"Details",
			];

			const rows = logs.map((log) => [
				log.timestamp.toISOString(),
				log.actionType,
				log.target,
				log.targetType,
				log.executor,
				log.status,
				log.playbook?.title || "N/A",
				log.undoExpiresAt && log.undoExpiresAt > new Date()
					? "Yes"
					: "No",
				log.undoExpiresAt?.toISOString() || "N/A",
				log.details ? JSON.stringify(log.details) : "N/A",
			]);

			// Convert to CSV format
			const csvContent = [
				headers.join(","),
				...rows.map((row) =>
					row
						.map((cell) => {
							// Escape quotes and wrap in quotes if contains comma
							const cellStr = String(cell);
							if (
								cellStr.includes(",") ||
								cellStr.includes('"')
							) {
								return `"${cellStr.replace(/"/g, '""')}"`;
							}
							return cellStr;
						})
						.join(",")
				),
			].join("\n");

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "audit_logs.exported",
					metadata: {
						count: logs.length,
					},
				},
			});

			return new NextResponse(csvContent, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
				},
			});
		} catch (error) {
			logger.error("Export error:", error);
			return NextResponse.json(
				{ error: "Failed to export audit logs" },
				{ status: 500 }
			);
		}
	});
}
