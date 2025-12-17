import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { ArchiveService } from "@/server/archive-service";
import { logger } from "@/lib/logger";

/**
 * Batch restore multiple archives
 * Triggered by user action or scheduled task
 */
export const batchRestoreArchives = inngest.createFunction(
	{
		id: "batch-restore-archives",
		name: "Batch restore multiple archived files",
		concurrency: {
			limit: 3,
			scope: "account",
		},
	},
	{ event: "archive/batch.restore" },
	async ({ event, step }) => {
		const { archiveIds, organizationId, userId } = event.data;

		logger.info(
			`Starting batch restore of ${archiveIds.length} archives for org ${organizationId}`
		);

		// Step 1: Validate all archives exist and belong to organization
		const archives = await step.run("validate-archives", async () => {
			const files = await prisma.archivedFile.findMany({
				where: {
					id: { in: archiveIds },
					organizationId,
					status: "ARCHIVED",
				},
			});

			if (files.length !== archiveIds.length) {
				logger.warn(
					`Only ${files.length}/${archiveIds.length} archives valid for restore`
				);
			}

			return files;
		});

		// Step 2: Queue individual restore events
		const results = await step.run("queue-restores", async () => {
			const queued = [];
			const failed = [];

			for (const archive of archives) {
				try {
					await inngest.send({
						name: "archive/file.restored",
						data: {
							archiveId: archive.id,
							organizationId: archive.organizationId,
							fileName: archive.name,
							source: archive.source,
						},
					});

					queued.push({
						archiveId: archive.id,
						fileName: archive.name,
					});
				} catch (error) {
					failed.push({
						archiveId: archive.id,
						fileName: archive.name,
						error: (error as Error).message,
					});
					logger.error(
						`Failed to queue restore for ${archive.id}:`,
						error
					);
				}
			}

			return { queued, failed };
		});

		// Step 3: Log activity
		await step.run("log-batch-activity", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					userId,
					action: "archive.batch.restore",
					metadata: {
						totalRequested: archiveIds.length,
						queued: results.queued.length,
						failed: results.failed.length,
						queuedFiles: results.queued,
						failedFiles: results.failed,
					},
				},
			});
		});

		// Step 4: Notify organization admins
		await step.run("notify-admins", async () => {
			const admins = await prisma.member.findMany({
				where: {
					organizationId,
					role: { in: ["OWNER", "ADMIN"] },
				},
				select: { userId: true },
			});

			await Promise.all(
				admins.map((admin) =>
					prisma.notification.create({
						data: {
							userId: admin.userId,
							type: "AUDIT_COMPLETE",
							title: "Batch restore initiated",
							message: `Batch restore queued for ${results.queued.length} of ${archiveIds.length} archived files.`,
							actionUrl: "/dashboard/archives",
							metadata: {
								queuedCount: results.queued.length,
								failedCount: results.failed.length,
								initiatedBy: userId,
							},
						},
					})
				)
			);

			logger.info(`Notified ${admins.length} admins about batch restore`);
		});

		return {
			success: true,
			totalRequested: archiveIds.length,
			queued: results.queued.length,
			failed: results.failed.length,
			details: results,
		};
	}
);

/**
 * Batch delete archives (before expiry)
 * For manual cleanup or policy-based deletion
 */
export const batchDeleteArchives = inngest.createFunction(
	{
		id: "batch-delete-archives",
		name: "Batch delete archived files",
		concurrency: {
			limit: 5,
			scope: "account",
		},
	},
	{ event: "archive/batch.delete" },
	async ({ event, step }) => {
		const { archiveIds, organizationId, userId, reason } = event.data;

		logger.info(
			`Starting batch delete of ${archiveIds.length} archives for org ${organizationId}`
		);

		// Step 1: Validate archives
		const archives = await step.run("validate-archives", async () => {
			const files = await prisma.archivedFile.findMany({
				where: {
					id: { in: archiveIds },
					organizationId,
					status: "ARCHIVED",
				},
			});

			return files;
		});

		// Step 2: Delete each archive
		const results = await step.run("delete-archives", async () => {
			const archiveService = new ArchiveService();
			const deleted = [];
			const failed = [];

			for (const archive of archives) {
				try {
					await archiveService.cleanupSingleArchive(archive.id);

					deleted.push({
						archiveId: archive.id,
						fileName: archive.name,
						sizeMb: archive.sizeMb,
					});

					logger.info(
						`Deleted archive: ${archive.name} (${archive.id})`
					);
				} catch (error) {
					failed.push({
						archiveId: archive.id,
						fileName: archive.name,
						error: (error as Error).message,
					});
					logger.error(`Failed to delete ${archive.id}:`, error);
				}
			}

			return { deleted, failed };
		});

		// Step 3: Log activity
		await step.run("log-batch-delete", async () => {
			await prisma.activity.create({
				data: {
					organizationId,
					userId,
					action: "archive.batch.delete",
					metadata: {
						totalRequested: archiveIds.length,
						deleted: results.deleted.length,
						failed: results.failed.length,
						reason: reason || "manual",
						deletedFiles: results.deleted,
						failedFiles: results.failed,
					},
				},
			});
		});

		// Step 4: Notify organization admins
		await step.run("notify-admins", async () => {
			const admins = await prisma.member.findMany({
				where: {
					organizationId,
					role: { in: ["OWNER", "ADMIN"] },
				},
				select: { userId: true },
			});

			await Promise.all(
				admins.map((admin) =>
					prisma.notification.create({
						data: {
							userId: admin.userId,
							type: "AUDIT_COMPLETE",
							title: "Batch delete completed",
							message: `Permanently deleted ${results.deleted.length} of ${archiveIds.length} archived files.`,
							actionUrl: "/dashboard/archives",
							metadata: {
								deletedCount: results.deleted.length,
								failedCount: results.failed.length,
								savedSpaceMb: results.deleted.reduce(
									(sum, f) => sum + f.sizeMb,
									0
								),
								reason: reason || "manual",
								initiatedBy: userId,
							},
						},
					})
				)
			);

			logger.info(`Notified ${admins.length} admins about batch delete`);
		});

		return {
			success: true,
			totalRequested: archiveIds.length,
			deleted: results.deleted.length,
			failed: results.failed.length,
			savedSpaceMb: results.deleted.reduce((sum, f) => sum + f.sizeMb, 0),
			details: results,
		};
	}
);

/**
 * Archive migration - move archives between storage providers
 * (e.g., from Vercel Blob to S3, or between buckets)
 */
export const migrateArchiveStorage = inngest.createFunction(
	{
		id: "migrate-archive-storage",
		name: "Migrate archives to new storage provider",
		concurrency: {
			limit: 2,
		},
	},
	{ event: "archive/migrate.storage" },
	async ({ event, step }) => {
		const { archiveIds, fromProvider, toProvider, organizationId } =
			event.data;

		logger.info(
			`Migrating ${archiveIds.length} archives from ${fromProvider} to ${toProvider}`
		);

		// Step 1: Validate migration request
		const archives = await step.run("validate-migration", async () => {
			if (fromProvider === toProvider) {
				throw new Error(
					"Source and destination providers are the same"
				);
			}

			const files = await prisma.archivedFile.findMany({
				where: {
					id: { in: archiveIds },
					organizationId,
					storageProvider: fromProvider,
				},
			});

			if (files.length !== archiveIds.length) {
				throw new Error(
					`Not all archives are on ${fromProvider} provider`
				);
			}

			return files;
		});

		// Step 2: Migrate each archive (placeholder logic)
		const results = await step.run("migrate-archives", async () => {
			const migrated = [];
			const failed = [];

			for (const archive of archives) {
				try {
					// TODO: Implement actual migration:
					// 1. Download from current provider
					// 2. Upload to new provider
					// 3. Update DB: storageProvider, storageKey, downloadUrl
					// 4. Delete from old provider

					// Placeholder success
					await prisma.archivedFile.update({
						where: { id: archive.id },
						data: { storageProvider: toProvider },
					});

					migrated.push(archive.id);
					logger.info(`Migrated archive ${archive.id}`);
				} catch (error) {
					failed.push({
						archiveId: archive.id,
						error: (error as Error).message,
					});
					logger.error(`Failed to migrate ${archive.id}:`, error);
				}
			}

			return { migrated, failed };
		});

		// Step 3: Notify admins
		await step.run("notify-admins", async () => {
			const admins = await prisma.member.findMany({
				where: {
					organizationId,
					role: { in: ["OWNER", "ADMIN"] },
				},
				select: { userId: true },
			});

			await Promise.all(
				admins.map((admin) =>
					prisma.notification.create({
						data: {
							userId: admin.userId,
							type: "INTEGRATION_ERROR", // Or custom type
							title: "Archive storage migration completed",
							message: `Migration from ${fromProvider} to ${toProvider}: ${results.migrated.length} succeeded, ${results.failed.length} failed.`,
							actionUrl: "/dashboard/archives",
							metadata: {
								fromProvider,
								toProvider,
								migratedCount: results.migrated.length,
								failedCount: results.failed.length,
							},
						},
					})
				)
			);
		});

		return {
			success: true,
			totalRequested: archiveIds.length,
			migrated: results.migrated.length,
			failed: results.failed.length,
			fromProvider,
			toProvider,
		};
	}
);
