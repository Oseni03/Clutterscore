import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { AuditLogActionType, AuditLogStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const ACTION_CATEGORIES: Record<string, AuditLogActionType[]> = {
	archive: [
		AuditLogActionType.ARCHIVE_FILE,
		AuditLogActionType.ARCHIVE_CHANNEL,
		AuditLogActionType.ARCHIVE_PAGE,
	],
	remove: [
		AuditLogActionType.REMOVE_GUEST,
		AuditLogActionType.REMOVE_LICENSE,
	],
	revoke: [
		AuditLogActionType.REVOKE_ACCESS,
		AuditLogActionType.UPDATE_PERMISSIONS,
	],
};

export async function GET(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { searchParams } = new URL(req.url);
			const page = parseInt(searchParams.get("page") || "1", 10);
			const limit = parseInt(searchParams.get("limit") || "20", 10);
			const actionType = searchParams.get("actionType");
			const category = searchParams.get("category");
			const status = searchParams.get("status");
			const search = searchParams.get("search")?.trim();
			const canUndo = searchParams.get("canUndo") === "true";

			const skip = (page - 1) * limit;
			const now = new Date();

			// Build where clause
			const where: Prisma.AuditLogWhereInput = {
				organizationId: user.organizationId,
			};

			if (category && ACTION_CATEGORIES[category]) {
				where.actionType = { in: ACTION_CATEGORIES[category] };
			} else if (actionType && actionType !== "all") {
				where.actionType = actionType as AuditLogActionType;
			}

			if (status && status !== "all") {
				where.status = status as AuditLogStatus;
			}

			if (search) {
				where.OR = [
					{ target: { contains: search, mode: "insensitive" } },
					{ targetType: { contains: search, mode: "insensitive" } },
					{ executor: { contains: search, mode: "insensitive" } },
				];
			}

			if (canUndo) {
				where.undoExpiresAt = { gt: now };
				where.undoActions = { isEmpty: false };
			}

			// Get audit logs with pagination
			const [
				logs,
				total,
				totalActions,
				successful,
				failed,
				undoable,
			] = await Promise.all([
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
							select: { title: true, source: true, impactType: true },
						},
					},
				}),
				prisma.auditLog.count({ where }),
				prisma.auditLog.count({
					where: { organizationId: user.organizationId },
				}),
				prisma.auditLog.count({
					where: {
						organizationId: user.organizationId,
						status: AuditLogStatus.SUCCESS,
					},
				}),
				prisma.auditLog.count({
					where: {
						organizationId: user.organizationId,
						status: AuditLogStatus.FAILED,
					},
				}),
				prisma.auditLog.count({
					where: {
						organizationId: user.organizationId,
						undoExpiresAt: { gt: now },
						undoActions: { isEmpty: false },
					},
				}),
			]);

			// Add derived fields
			const enrichedLogs = logs.map((log) => {
				const details = (log.details ?? {}) as Record<string, unknown>;
				const undone = details.undone === true;
				const hasUndoActions =
					Array.isArray(log.undoActions) &&
					log.undoActions.length > 0;

				return {
					...log,
					canUndo:
						!undone &&
						!!log.undoExpiresAt &&
						log.undoExpiresAt > now &&
						hasUndoActions,
					daysUntilExpiry: log.undoExpiresAt
						? Math.ceil(
								(log.undoExpiresAt.getTime() - now.getTime()) /
									(1000 * 60 * 60 * 24)
							)
						: null,
					isUndone: undone,
				};
			});

			return NextResponse.json({
				logs: enrichedLogs,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
				stats: {
					totalActions,
					successful,
					failed,
					undoable,
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
