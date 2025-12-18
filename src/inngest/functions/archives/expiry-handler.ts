import { inngest } from "../../client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Handle individual file expiring warning
 * Triggered 7 days before expiry by the archive creation handler
 */
export const handleFileExpiring = inngest.createFunction(
	{
		id: "handle-file-expiring",
		name: "Send expiry warning for individual file",
	},
	{ event: "archive/file.expiring" },
	async ({ event, step }) => {
		const { archiveId, organizationId, fileName, daysRemaining } =
			event.data;

		// Step 1: Verify archive still exists and is not restored
		const archive = await step.run("verify-archive", async () => {
			const file = await prisma.archivedFile.findUnique({
				where: { id: archiveId },
				include: {
					organization: {
						select: { id: true, name: true },
					},
				},
			});

			if (!file) {
				logger.warn(
					`Archive ${archiveId} not found for expiry warning`
				);
				return null;
			}

			if (file.status !== "ARCHIVED") {
				logger.info(
					`Archive ${archiveId} is ${file.status}, skipping expiry warning`
				);
				return null;
			}

			return file;
		});

		if (!archive) {
			return {
				skipped: true,
				reason: "Archive not found or not archived",
			};
		}

		// Step 2: Create notification record for admins
		const notification = await step.run("create-notification", async () => {
			const admins = await prisma.member.findMany({
				where: {
					organizationId,
					role: { in: ["OWNER", "ADMIN"] },
				},
				select: { userId: true },
			});

			const notifications = await Promise.all(
				admins.map((admin) =>
					prisma.notification.create({
						data: {
							userId: admin.userId,
							type: "RISK_DETECTED",
							title: `Archive expiring soon: ${fileName}`,
							message: `The archived file "${fileName}" will be permanently deleted in ${daysRemaining} day(s).`,
							actionUrl: `/dashboard/archives?highlight=${archiveId}`,
							metadata: {
								archiveId,
								fileName,
								daysRemaining,
								expiresAt: (
									archive.expiresAt as unknown as Date
								).toISOString(),
								source: archive.source,
							},
						},
					})
				)
			);

			logger.info(
				`Created ${notifications.length} notifications for expiring archive ${archiveId}`
			);

			return notifications;
		});

		// Step 3: Log activity
		await step.run("log-activity", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					action: "archive.expiring.warned",
					metadata: {
						archiveId,
						fileName,
						daysRemaining,
						notificationsSent: notification.length,
					},
				},
			});
		});

		return {
			success: true,
			archiveId,
			fileName,
			daysRemaining,
			notificationsSent: notification.length,
		};
	}
);

/**
 * Check for archives expiring in 24 hours (final warning)
 * Runs daily to catch any files about to be deleted
 */
export const sendFinalExpiryWarnings = inngest.createFunction(
	{
		id: "send-final-expiry-warnings",
		name: "Send final 24-hour expiry warnings",
	},
	{ cron: "0 10 * * *" }, // Daily at 10 AM UTC
	async ({ step }) => {
		// Find archives expiring in the next 24 hours
		const expiringTomorrow = await step.run(
			"find-final-expiring-archives",
			async () => {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				tomorrow.setHours(0, 0, 0, 0);

				const dayAfter = new Date(tomorrow);
				dayAfter.setDate(dayAfter.getDate() + 1);

				const files = await prisma.archivedFile.findMany({
					where: {
						expiresAt: {
							gte: tomorrow,
							lt: dayAfter,
						},
						status: "ARCHIVED",
					},
					include: {
						organization: { select: { id: true, name: true } },
					},
				});

				logger.info(
					`Found ${files.length} archives expiring in 24 hours`
				);

				return files;
			}
		);

		if (expiringTomorrow.length === 0) {
			return { message: "No archives expiring in next 24 hours" };
		}

		// Send final warning notifications
		const warnings = await step.run("send-final-warnings", async () => {
			const sent = [];

			for (const archive of expiringTomorrow) {
				const admins = await prisma.member.findMany({
					where: {
						organizationId: archive.organizationId,
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
								title: `URGENT: Archive expiring tomorrow – ${archive.name}`,
								message: `The archived file "${archive.name}" will be permanently deleted tomorrow. Restore now if needed.`,
								actionUrl: `/dashboard/archives?highlight=${archive.id}`,
								metadata: {
									archiveId: archive.id,
									fileName: archive.name,
									expiresAt: (
										archive.expiresAt as unknown as Date
									).toISOString(),
									urgent: true,
								},
							},
						})
					)
				);

				sent.push(archive.id);
			}

			return sent;
		});

		return {
			success: true,
			filesExpiring: expiringTomorrow.length,
			warningsSent: warnings.length,
		};
	}
);
