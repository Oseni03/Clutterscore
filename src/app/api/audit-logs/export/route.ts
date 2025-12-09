import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			// Fetch all audit logs
			const logs = await prisma.auditLog.findMany({
				where: {
					organizationId: user.organizationId,
				},
				include: {
					user: {
						select: {
							name: true,
							email: true,
						},
					},
					playbook: {
						select: {
							title: true,
							source: true,
						},
					},
				},
				orderBy: {
					timestamp: "desc",
				},
			});

			// Generate CSV
			const headers = [
				"Timestamp",
				"Action Type",
				"Target",
				"Target Type",
				"Executor",
				"Status",
				"Details",
				"User Email",
				"Playbook",
			];

			const rows = logs.map((log) => [
				log.timestamp.toISOString(),
				log.actionType,
				log.target,
				log.targetType,
				log.executor,
				log.status,
				typeof log.details === "object"
					? JSON.stringify(log.details)
					: log.details || "",
				log.user?.email || "",
				log.playbook?.title || "",
			]);

			const csv = [
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
					action: "audit_logs.exported",
					metadata: {
						count: logs.length,
					},
				},
			});

			return new NextResponse(csv, {
				headers: {
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
				},
			});
		} catch (error) {
			logger.error("Failed to export audit logs:", error as Error);
			return NextResponse.json(
				{
					error:
						(error as Error).message ||
						"Failed to export audit logs",
				},
				{ status: 500 }
			);
		}
	});
}
