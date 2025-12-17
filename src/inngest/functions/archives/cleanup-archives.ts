import { inngest } from "../../client";
import { ArchiveService } from "@/server/archive-service";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Scheduled function: Clean up expired archives
 * Runs daily at 2 AM UTC
 */
export const cleanupExpiredArchives = inngest.createFunction(
	{
		id: "cleanup-expired-archives",
		name: "Clean up expired archived files",
		retries: 3,
	},
	{ cron: "0 2 * * *" }, // Every day at 2 AM UTC
	async ({ step }) => {
		const archiveService = new ArchiveService();

		// Step 1: Find expired archives
		const expiredFiles = await step.run(
			"find-expired-archives",
			async () => {
				const files = await prisma.archivedFile.findMany({
					where: {
						expiresAt: { lt: new Date() },
						status: "ARCHIVED",
					},
					select: {
						id: true,
						name: true,
						organizationId: true,
						sizeMb: true,
						source: true,
					},
				});

				logger.info(
					`Found ${files.length} expired archives to clean up`
				);
				return files;
			}
		);

		if (expiredFiles.length === 0) {
			return { message: "No expired archives to clean up", deleted: 0 };
		}

		// Step 2: Delete each archive (with automatic retries per file)
		const results = await step.run("delete-archives", async () => {
			let deleted = 0;
			let failed = 0;

			for (const file of expiredFiles) {
				try {
					await archiveService.cleanupSingleArchive(file.id);
					deleted++;

					logger.info(
						`Deleted expired archive: ${file.name} (${file.id})`
					);

					// Log activity per deleted file
					await prisma.activity.create({
						data: {
							organizationId: file.organizationId,
							action: "archive.file.deleted",
							metadata: {
								archiveId: file.id,
								fileName: file.name,
								sizeMb: file.sizeMb,
								source: file.source,
							},
						},
					});
				} catch (error) {
					failed++;
					logger.error(`Failed to delete archive ${file.id}:`, error);
				}
			}

			return { deleted, failed, total: expiredFiles.length };
		});

		// Step 3: Create notification for affected organizations
		await step.run("create-cleanup-notifications", async () => {
			const orgIds = [
				...new Set(expiredFiles.map((f) => f.organizationId)),
			];

			for (const orgId of orgIds) {
				const admins = await prisma.member.findMany({
					where: {
						organizationId: orgId,
						role: { in: ["OWNER", "ADMIN"] },
					},
					select: { userId: true },
				});

				const orgDeletedCount = expiredFiles.filter(
					(f) => f.organizationId === orgId
				).length;

				await Promise.all(
					admins.map((admin) =>
						prisma.notification.create({
							data: {
								userId: admin.userId,
								type: "AUDIT_COMPLETE",
								title: "Expired archives permanently deleted",
								message: `${orgDeletedCount} archived file(s) have been permanently deleted due to expiry.`,
								actionUrl: "/dashboard/archives",
								metadata: {
									deletedCount: orgDeletedCount,
									cleanupRunAt: new Date().toISOString(),
								},
							},
						})
					)
				);
			}

			logger.info(
				`Created cleanup notifications for ${orgIds.length} organizations`
			);
		});

		// Step 4: Send summary notification (optional)
		if (results.deleted > 0 || results.failed > 0) {
			await step.run("send-cleanup-summary", async () => {
				logger.info("Cleanup summary:", results);
			});
		}

		return {
			message: `Cleanup complete: ${results.deleted} deleted, ${results.failed} failed`,
			...results,
		};
	}
);

/**
 * Event-triggered function: Send expiry warnings
 * Triggers when archives are about to expire (7 days before)
 */
export const sendExpiryWarnings = inngest.createFunction(
	{
		id: "send-expiry-warnings",
		name: "Send warnings for expiring archives",
	},
	{ cron: "0 9 * * *" }, // Daily at 9 AM UTC
	async ({ step }) => {
		// Find archives expiring in the next 7 days
		const expiringSoon = await step.run(
			"find-expiring-archives",
			async () => {
				const sevenDaysFromNow = new Date();
				sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

				const files = await prisma.archivedFile.findMany({
					where: {
						expiresAt: {
							gte: new Date(),
							lte: sevenDaysFromNow,
						},
						status: "ARCHIVED",
					},
					include: {
						organization: {
							select: { id: true, name: true },
						},
					},
				});

				return files;
			}
		);

		if (expiringSoon.length === 0) {
			return { message: "No archives expiring soon" };
		}

		// Group by organization and create notifications
		const notifications = await step.run("send-notifications", async () => {
			const byOrg: Record<
				string,
				{
					files: typeof expiringSoon;
					organization: { id: string; name: string };
				}
			> = {};

			expiringSoon.forEach((file) => {
				const orgId = file.organizationId;
				if (!byOrg[orgId]) {
					byOrg[orgId] = {
						files: [],
						organization: file.organization,
					};
				}
				byOrg[orgId].files.push(file);
			});

			const sent = [];

			for (const [orgId, data] of Object.entries(byOrg)) {
				const admins = await prisma.member.findMany({
					where: {
						organizationId: orgId,
						role: { in: ["OWNER", "ADMIN"] },
					},
					select: { userId: true },
				});

				await Promise.all(
					admins.map((admin) =>
						prisma.notification.create({
							data: {
								userId: admin.userId,
								type: "RISK_DETECTED",
								title: `${data.files.length} archived file(s) expiring soon`,
								message: `${data.files.length} archived file(s) will be permanently deleted in 7 days unless restored.`,
								actionUrl: "/dashboard/archives",
								metadata: {
									expiringFileCount: data.files.length,
									organizationId: orgId,
									expiringFiles: data.files.map((f) => ({
										id: f.id,
										name: f.name,
										expiresAt: f.expiresAt,
									})),
								},
							},
						})
					)
				);

				sent.push({
					organizationId: orgId,
					fileCount: data.files.length,
					notificationsSent: admins.length,
				});

				logger.info(
					`Sent expiry warning to ${data.organization.name} for ${data.files.length} files`
				);
			}

			return sent;
		});

		return {
			message: `Sent ${notifications.length} expiry warnings`,
			organizations: notifications,
			totalFiles: expiringSoon.length,
		};
	}
);
