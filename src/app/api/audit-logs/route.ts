/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { AuditLogActionType, AuditLogStatus } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "20", 10);
			const actionType = searchParams.get("actionType");
			const status = searchParams.get("status");
			const canUndo = searchParams.get("canUndo") === "true";

			const skip = (page - 1) * limit;

			// Build where clause
			const where: any = {
				organizationId: user.organizationId,
			};

			if (actionType && actionType !== "all") {
				where.actionType = actionType as AuditLogActionType;
			}

			if (status && status !== "all") {
				where.status = status as AuditLogStatus;
			}

			if (canUndo) {
				where.undoExpiresAt = { gt: new Date() };
				where.undoActions = { isEmpty: false };
			}

			// Get audit logs with pagination
			const [logs, total] = await Promise.all([
				prisma.auditLog.findMany({
					where,
					orderBy: { timestamp: "desc" },
					skip,
					take: limit,
					include: {
						user: {
							select: { name: true, email: true },
						},
						playbook: {
							select: { title: true, impactType: true },
						},
					},
				}),
				prisma.auditLog.count({ where }),
			]);

			// Add derived fields
			const enrichedLogs = logs.map((log) => ({
				...log,
				canUndo:
					log.undoExpiresAt &&
					log.undoExpiresAt > new Date() &&
					log.undoActions &&
					(log.undoActions as any[]).length > 0,
				daysUntilExpiry: log.undoExpiresAt
					? Math.ceil(
							(log.undoExpiresAt.getTime() - Date.now()) /
								(1000 * 60 * 60 * 24)
						)
					: null,
			}));

			return NextResponse.json({
				logs: enrichedLogs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		} catch (error) {
			logger.error("Failed to fetch audit logs:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
