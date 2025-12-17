/* eslint-disable @typescript-eslint/no-explicit-any */
import { inngest } from "../../client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * Handle new archive creation
 * Triggered when a file is archived
 */
export const handleArchiveCreated = inngest.createFunction(
	{
		id: "handle-archive-created",
		name: "Process newly archived file",
	},
	{ event: "archive/file.created" },
	async ({ event, step }) => {
		const { archiveId, organizationId, fileName } = event.data;

		// Step 1: Verify archive was created successfully
		const archive = await step.run("verify-archive", async () => {
			const file = await prisma.archivedFile.findUnique({
				where: { id: archiveId },
			});

			if (!file) {
				throw new Error(`Archive ${archiveId} not found`);
			}

			logger.info(`Archive verified: ${fileName} (${archiveId})`);
			return file;
		});

		// Step 2: Schedule expiry reminder (7 days before expiry)
		await step.run("schedule-expiry-reminder", async () => {
			const reminderDate = new Date(archive.expiresAt);
			reminderDate.setDate(reminderDate.getDate() - 7);

			if (reminderDate > new Date()) {
				await inngest.send({
					name: "archive/file.expiring",
					data: {
						archiveId,
						organizationId,
						fileName,
						daysRemaining: 7,
					},
					ts: reminderDate.getTime(),
				});

				logger.info(
					`Scheduled expiry reminder for ${fileName} on ${reminderDate.toISOString()}`
				);
			}
		});

		// Step 3: Update organization statistics
		await step.run("update-stats", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					action: "archive.file.created",
					metadata: {
						archiveId,
						fileName,
						sizeMb: archive.sizeMb,
						source: archive.source,
					},
				},
			});
		});

		// Step 4: Create notification for organization admins
		await step.run("create-archive-notification", async () => {
			// Find organization admins
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
							type: "AUDIT_COMPLETE", // Or custom type if needed
							title: `File archived: ${fileName}`,
							message: `A new file "${fileName}" has been archived. It will expire on ${(archive.expiresAt as unknown as Date).toISOString()}.`,
							actionUrl: `/dashboard/archives?highlight=${archiveId}`,
							metadata: {
								archiveId,
								fileName,
								source: archive.source,
								sizeMb: archive.sizeMb,
							},
						},
					})
				)
			);

			logger.info(
				`Created ${notifications.length} notifications for new archive ${archiveId}`
			);
		});

		return {
			success: true,
			archiveId,
			fileName,
			expiresAt: archive.expiresAt,
		};
	}
);

/**
 * Handle archive restoration
 * Triggered when a file is restored from archive
 */
export const handleArchiveRestored = inngest.createFunction(
	{
		id: "handle-archive-restored",
		name: "Process restored archive",
	},
	{ event: "archive/file.restored" },
	async ({ event, step }) => {
		const { archiveId, organizationId, fileName, source } = event.data;

		// Step 1: Update archive status
		await step.run("update-archive-status", async () => {
			await prisma.archivedFile.update({
				where: { id: archiveId },
				data: {
					status: "RESTORED",
					metadata: {
						restoredAt: new Date().toISOString(),
					} as any,
				},
			});

			logger.info(`Updated archive status to RESTORED: ${archiveId}`);
		});

		// Step 2: Log activity
		await step.run("log-restore-activity", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					action: "archive.file.restored",
					metadata: {
						archiveId,
						fileName,
						source,
						restoredAt: new Date().toISOString(),
					},
				},
			});
		});

		// Step 3: Create notification for organization admins
		await step.run("create-restore-notification", async () => {
			// Find organization admins
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
							type: "AUDIT_COMPLETE", // Or custom type if needed
							title: `File restored: ${fileName}`,
							message: `The archived file "${fileName}" from ${source} has been restored.`,
							actionUrl: `/dashboard/archives?highlight=${archiveId}`,
							metadata: {
								archiveId,
								fileName,
								source,
								restoredAt: new Date().toISOString(),
							},
						},
					})
				)
			);

			logger.info(
				`Created ${notifications.length} notifications for restored archive ${archiveId}`
			);
		});

		return {
			success: true,
			archiveId,
			fileName,
			source,
		};
	}
);

/**
 * Batch archive files after playbook execution
 * Triggered when a playbook is executed with multiple files
 */
export const batchArchiveFiles = inngest.createFunction(
	{
		id: "batch-archive-files",
		name: "Batch archive files from playbook",
		concurrency: {
			limit: 5, // Process 5 files at a time
		},
	},
	{ event: "playbook/executed" },
	async ({ event, step }) => {
		const { playbookId, organizationId, archivedFiles } = event.data;

		if (!archivedFiles || archivedFiles.length === 0) {
			return { message: "No files to process" };
		}

		logger.info(
			`Processing ${archivedFiles.length} archived files from playbook ${playbookId}`
		);

		// Process each archive (Inngest handles concurrency)
		const results = await step.run("process-archives", async () => {
			const processed = [];

			for (const archiveId of archivedFiles) {
				try {
					// Send individual archive created event
					await inngest.send({
						name: "archive/file.created",
						data: {
							archiveId,
							organizationId,
							fileName: "Processing...",
							source: "BATCH",
							expiresAt: new Date(
								Date.now() + 30 * 24 * 60 * 60 * 1000
							).toISOString(),
						},
					});

					processed.push(archiveId);
				} catch (error) {
					logger.error(
						`Failed to process archive ${archiveId}:`,
						error
					);
				}
			}

			return processed;
		});

		// Step: Create batch notification for organization admins
		await step.run("create-batch-notification", async () => {
			// Find organization admins
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
							type: "PLAYBOOK_READY", // Or custom type if needed
							title: `Batch archive completed for playbook ${playbookId}`,
							message: `${results.length} files successfully archived out of ${archivedFiles.length}.`,
							actionUrl: `/dashboard/playbooks/${playbookId}`,
							metadata: {
								playbookId,
								processedCount: results.length,
								totalCount: archivedFiles.length,
								failedCount:
									archivedFiles.length - results.length,
							},
						},
					})
				)
			);

			logger.info(
				`Created ${notifications.length} notifications for batch archive from playbook ${playbookId}`
			);
		});

		return {
			success: true,
			playbookId,
			processed: results.length,
			total: archivedFiles.length,
		};
	}
);
