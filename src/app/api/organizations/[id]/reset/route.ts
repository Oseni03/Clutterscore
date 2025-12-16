// app/api/organization/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";

/**
 * POST /api/organization/reset
 * Resets all organization data including audits, playbooks, files, activities, and notifications.
 * Preserves users, organization settings, and integrations.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: organizationId } = await params;

	return withAuth(req, async (req, user) => {
		if (!organizationId) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 }
			);
		}

		try {
			// Perform cascading deletion in a transaction
			await prisma.$transaction(async (tx) => {
				// Delete files (cascades from AuditResult)
				await tx.file.deleteMany({
					where: {
						auditResult: {
							organizationId,
						},
					},
				});

				// Delete playbook items
				await tx.playbookItem.deleteMany({
					where: {
						playbook: {
							organizationId,
						},
					},
				});

				// Delete audit logs
				await tx.auditLog.deleteMany({
					where: { organizationId },
				});

				// Delete playbooks
				await tx.playbook.deleteMany({
					where: { organizationId },
				});

				// Delete audit results
				await tx.auditResult.deleteMany({
					where: { organizationId },
				});

				// Delete score trends
				await tx.scoreTrend.deleteMany({
					where: { organizationId },
				});

				// Delete score trends
				await tx.scoreTrend.deleteMany({
					where: { organizationId },
				});

				// Delete activities
				await tx.activity.deleteMany({
					where: { organizationId },
				});

				// Delete user notifications for this organization
				const orgMembers = await tx.member.findMany({
					where: { organizationId },
					select: { userId: true },
				});

				if (orgMembers.length > 0) {
					await tx.notification.deleteMany({
						where: {
							userId: {
								in: orgMembers.map((m) => m.userId),
							},
						},
					});
				}

				// Reset organization metrics to defaults
				await tx.organization.update({
					where: { id: organizationId },
					data: {
						targetScore: 75,
					},
				});
			});

			// Log the reset action
			await prisma.activity.create({
				data: {
					organizationId,
					userId: user.id,
					action: "organization.reset",
					metadata: {
						timestamp: new Date().toISOString(),
						performedBy: user.email,
					},
				},
			});

			return NextResponse.json({
				success: true,
				message: "All organization data has been reset successfully",
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			console.error("Failed to reset organization data:", error);
			return NextResponse.json(
				{
					error: "Failed to reset organization data",
					details:
						error instanceof Error
							? error.message
							: "Unknown error",
				},
				{ status: 500 }
			);
		}
	});
}
