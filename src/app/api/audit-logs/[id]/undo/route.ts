/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { AuditLogStatus } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import { logger } from "@/lib/logger";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	return withAuth(req, async (req, user) => {
		const { id } = await params;

		// Fetch audit log with undo data
		const auditLog = await prisma.auditLog.findUnique({
			where: { id, organizationId: user.organizationId },
			include: {
				playbook: {
					select: {
						source: true,
					},
				},
			},
		});

		if (!auditLog) {
			return NextResponse.json(
				{ error: "Audit log not found" },
				{ status: 404 }
			);
		}

		// Check if undo is still valid (within 30 days)
		if (auditLog.undoExpiresAt && auditLog.undoExpiresAt < new Date()) {
			return NextResponse.json(
				{ error: "Undo period expired (30 days)" },
				{ status: 400 }
			);
		}

		if (!auditLog.undoActions || auditLog.undoActions.length === 0) {
			return NextResponse.json(
				{ error: "No undo actions available" },
				{ status: 400 }
			);
		}

		try {
			// Get integration for the playbook's source
			const source = auditLog.playbook?.source;

			if (!source) {
				return NextResponse.json(
					{ error: "Cannot determine source for undo action" },
					{ status: 400 }
				);
			}

			const integration = await prisma.toolIntegration.findUnique({
				where: {
					organizationId_source: {
						organizationId: user.organizationId,
						source,
					},
				},
			});

			if (!integration) {
				return NextResponse.json(
					{ error: `Integration ${source} not found` },
					{ status: 404 }
				);
			}

			// Create connector
			const connector = ConnectorFactory.create(source, {
				accessToken: integration.accessToken,
				refreshToken: integration.refreshToken || undefined,
				organizationId: user.organizationId,
				metadata: integration.metadata as Record<string, any>,
			});

			// Execute undo actions
			const undoResults = [];

			for (const undoAction of auditLog.undoActions as any[]) {
				try {
					switch (undoAction.type) {
						case "restore_file":
							await connector.restoreFile(undoAction);
							undoResults.push({
								type: undoAction.type,
								fileId: undoAction.fileId,
								fileName: undoAction.fileName,
								status: "restored",
							});
							break;

						case "restore_access":
							await connector.restoreAccess(undoAction);
							undoResults.push({
								type: undoAction.type,
								userId: undoAction.userId,
								userEmail: undoAction.userEmail,
								status: "restored",
							});
							break;

						case "restore_permissions":
							await connector.restorePermissions(undoAction);
							undoResults.push({
								type: undoAction.type,
								fileId: undoAction.fileId,
								fileName: undoAction.fileName,
								status: "restored",
							});
							break;

						case "restore_channel":
							await connector.restoreChannel(undoAction);
							undoResults.push({
								type: undoAction.type,
								channelId: undoAction.channelId,
								channelName: undoAction.channelName,
								status: "restored",
							});
							break;

						case "restore_user":
							await connector.restoreUser(undoAction);
							undoResults.push({
								type: undoAction.type,
								userId: undoAction.userId,
								userEmail: undoAction.userEmail,
								status: "restored",
							});
							break;

						case "restore_license":
							await connector.restoreLicense(undoAction);
							undoResults.push({
								type: undoAction.type,
								userId: undoAction.userId,
								userEmail: undoAction.userEmail,
								status: "restored",
							});
							break;

						default:
							undoResults.push({
								type: undoAction.type,
								status: "skipped",
								reason: "Unknown action type",
							});
							logger.warn(
								`Unknown undo action type: ${undoAction.type}`
							);
					}
				} catch (error: any) {
					// Log individual action failure but continue with others
					logger.error(`Failed to undo action:`, {
						action: undoAction,
						error: error.message,
					});

					undoResults.push({
						type: undoAction.type,
						status: "failed",
						error: error.message,
					});
				}
			}

			// Check if all actions failed
			const allFailed = undoResults.every((r) => r.status === "failed");
			const someSucceeded = undoResults.some(
				(r) => r.status === "restored"
			);

			// Update audit log status
			const updatedLog = await prisma.auditLog.update({
				where: { id },
				data: {
					status: allFailed
						? AuditLogStatus.FAILED
						: someSucceeded
							? AuditLogStatus.SUCCESS
							: AuditLogStatus.PENDING,
					details: {
						...(auditLog.details as object),
						undone: someSucceeded,
						undoTimestamp: new Date().toISOString(),
						undoResults,
						undoneBy: user.id,
						partialUndo:
							someSucceeded &&
							!allFailed &&
							undoResults.some((r) => r.status === "failed"),
					},
				},
			});

			// Create activity log
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "audit.undo",
					metadata: {
						auditLogId: id,
						actionType: auditLog.actionType,
						target: auditLog.target,
						undoResults,
						success: someSucceeded,
						failed: allFailed,
					},
				},
			});

			return NextResponse.json({
				success: someSucceeded,
				message: allFailed
					? "All undo actions failed"
					: someSucceeded
						? undoResults.some((r) => r.status === "failed")
							? "Some actions were undone successfully"
							: "All actions undone successfully"
						: "No actions were executed",
				results: undoResults,
				auditLog: updatedLog,
			});
		} catch (error: any) {
			logger.error("Undo error:", error);

			await prisma.auditLog.update({
				where: { id },
				data: {
					status: AuditLogStatus.FAILED,
					details: {
						...(auditLog.details as object),
						undoError: error.message,
						undoAttemptedAt: new Date().toISOString(),
					},
				},
			});

			return NextResponse.json(
				{ error: `Failed to undo action: ${error.message}` },
				{ status: 500 }
			);
		}
	});
}
