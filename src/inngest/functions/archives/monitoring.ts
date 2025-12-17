/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/inngest/functions/monitoring.ts
import { inngest } from "../../client";
import { prisma } from "@/lib/prisma";
import { ArchiveService } from "@/server/archive-service";
import { logger } from "@/lib/logger";

/**
 * Daily health check for archive system
 * Verifies archive integrity and reports issues
 */
export const archiveHealthCheck = inngest.createFunction(
	{
		id: "archive-health-check",
		name: "Daily archive system health check",
	},
	{ cron: "0 6 * * *" }, // Daily at 6 AM UTC
	async ({ step }) => {
		const archiveService = new ArchiveService();

		// Step 1: Check for orphaned database records
		const orphanedRecords = await step.run(
			"check-orphaned-records",
			async () => {
				const archives = await prisma.archivedFile.findMany({
					where: {
						status: "ARCHIVED",
					},
					select: {
						id: true,
						name: true,
						downloadUrl: true,
					},
					take: 100, // Sample check
				});

				const orphaned = [];

				for (const archive of archives) {
					const exists = await archiveService.fileExists(archive.id);
					if (!exists) {
						orphaned.push({
							id: archive.id,
							name: archive.name,
						});
					}
				}

				if (orphaned.length > 0) {
					logger.warn(
						`Found ${orphaned.length} orphaned archive records`
					);
				}

				return orphaned;
			}
		);

		// Step 2: Check storage usage across all organizations
		const storageStats = await step.run("check-storage-usage", async () => {
			const stats = await prisma.archivedFile.groupBy({
				by: ["organizationId"],
				where: {
					status: "ARCHIVED",
				},
				_sum: {
					sizeMb: true,
				},
				_count: {
					id: true,
				},
			});

			// Find organizations with high storage usage
			const highUsage = stats
				.filter((s) => (s._sum.sizeMb || 0) > 10000) // > 10 GB
				.map((s) => ({
					organizationId: s.organizationId,
					sizeMb: s._sum.sizeMb || 0,
					fileCount: s._count.id,
				}));

			return {
				totalOrganizations: stats.length,
				highUsageOrganizations: highUsage,
			};
		});

		// Step 3: Check for stuck archives (created but never uploaded)
		const stuckArchives = await step.run(
			"check-stuck-archives",
			async () => {
				const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

				const stuck = await prisma.archivedFile.findMany({
					where: {
						status: "STAGED",
						createdAt: {
							lt: oneDayAgo,
						},
					},
					select: {
						id: true,
						name: true,
						organizationId: true,
						createdAt: true,
					},
				});

				if (stuck.length > 0) {
					logger.warn(
						`Found ${stuck.length} archives stuck in STAGED status`
					);
				}

				return stuck;
			}
		);

		// Step 4: Generate health report
		const healthReport = await step.run(
			"generate-health-report",
			async () => {
				const totalArchives = await prisma.archivedFile.count({
					where: { status: "ARCHIVED" },
				});

				const totalSize = await prisma.archivedFile.aggregate({
					where: { status: "ARCHIVED" },
					_sum: { sizeMb: true },
				});

				const report = {
					timestamp: new Date().toISOString(),
					healthy:
						orphanedRecords.length === 0 &&
						stuckArchives.length === 0,
					totalArchives,
					totalSizeMb: totalSize._sum.sizeMb || 0,
					issues: {
						orphanedRecords: orphanedRecords.length,
						stuckArchives: stuckArchives.length,
						highUsageOrgs:
							storageStats.highUsageOrganizations.length,
					},
					details: {
						orphanedRecords,
						stuckArchives,
						highUsageOrgs: storageStats.highUsageOrganizations,
					},
				};

				// Log health report
				if (!report.healthy) {
					logger.error("Archive health check FAILED:", report);
				} else {
					logger.info("Archive health check PASSED:", {
						totalArchives: report.totalArchives,
						totalSizeMb: report.totalSizeMb,
					});
				}

				return report;
			}
		);

		// Step 5: Create notification on health issues
		if (!healthReport.healthy) {
			await step.run("create-health-alert-notification", async () => {
				const systemAdmins = await prisma.member.findMany({
					where: { role: { in: ["OWNER", "ADMIN"] } }, // Adjust if you have global admins
					select: { userId: true },
				});

				await Promise.all(
					systemAdmins.map((admin) =>
						prisma.notification.create({
							data: {
								userId: admin.userId,
								type: "INTEGRATION_ERROR",
								title: "Archive system health issue detected",
								message: `Health check failed: ${healthReport.issues.orphanedRecords} orphaned, ${healthReport.issues.stuckArchives} stuck.`,
								// actionUrl: "/admin/archives/health",
								metadata: healthReport,
							},
						})
					)
				);

				logger.error("Created health alert notifications");
			});
		}

		return healthReport;
	}
);

/**
 * Weekly archive statistics report
 * Sends comprehensive stats to organization admins
 */
export const weeklyArchiveReport = inngest.createFunction(
	{
		id: "weekly-archive-report",
		name: "Weekly archive statistics report",
	},
	{ cron: "0 9 * * 1" }, // Every Monday at 9 AM UTC
	async ({ step }) => {
		// Get date range (last 7 days)
		const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		// Step 1: Calculate weekly statistics
		const weeklyStats = await step.run(
			"calculate-weekly-stats",
			async () => {
				const [archived, restored, deleted] = await Promise.all([
					// Files archived this week
					prisma.archivedFile.count({
						where: {
							archivedAt: { gte: oneWeekAgo },
							status: { in: ["ARCHIVED", "RESTORED"] },
						},
					}),

					// Files restored this week
					prisma.archivedFile.count({
						where: {
							status: "RESTORED",
							updatedAt: { gte: oneWeekAgo },
						},
					}),

					// Files deleted this week
					prisma.archivedFile.count({
						where: {
							status: "DELETED",
							updatedAt: { gte: oneWeekAgo },
						},
					}),
				]);

				return {
					archived,
					restored,
					deleted,
					netChange: archived - deleted,
				};
			}
		);

		// Step 2: Get per-organization breakdown
		const organizationBreakdown = await step.run(
			"get-organization-breakdown",
			async () => {
				const orgs = await prisma.archivedFile.groupBy({
					by: ["organizationId"],
					where: {
						status: "ARCHIVED",
					},
					_count: {
						id: true,
					},
					_sum: {
						sizeMb: true,
					},
				});

				const enriched = await Promise.all(
					orgs.map(async (org) => {
						const organization =
							await prisma.organization.findUnique({
								where: { id: org.organizationId },
								select: { name: true },
							});

						return {
							organizationId: org.organizationId,
							organizationName: organization?.name || "Unknown",
							fileCount: org._count.id,
							sizeMb: org._sum.sizeMb || 0,
							sizeGb: ((org._sum.sizeMb || 0) / 1024).toFixed(2),
						};
					})
				);

				// Sort by size descending
				return enriched.sort((a, b) => b.sizeMb - a.sizeMb);
			}
		);

		// Step 3: Create notification for each organization with archives
		await step.run("create-weekly-notifications", async () => {
			const orgsWithArchives = organizationBreakdown.filter(
				(org) => org.fileCount > 0
			);

			for (const org of orgsWithArchives) {
				const admins = await prisma.member.findMany({
					where: {
						organizationId: org.organizationId,
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
								title: "Weekly archive report",
								message: `You have ${org.fileCount} archived files totaling ${org.sizeGb} GB.`,
								actionUrl: "/dashboard/archives",
								metadata: {
									...weeklyStats,
									organizationStats: org,
								},
							},
						})
					)
				);
			}

			logger.info(
				`Created weekly report notifications for ${orgsWithArchives.length} organizations`
			);
		});

		return {
			success: true,
			weeklyStats,
			organizationCount: organizationBreakdown.length,
			topOrganizations: organizationBreakdown.slice(0, 10),
		};
	}
);

/**
 * Monitor and alert on failed archive uploads
 * Runs every hour to catch issues quickly
 */
export const monitorFailedArchives = inngest.createFunction(
	{
		id: "monitor-failed-archives",
		name: "Monitor failed archive operations",
	},
	{ cron: "0 * * * *" }, // Every hour
	async ({ step }) => {
		// Check for recent failed activities
		const failedActivities = await step.run(
			"check-failed-activities",
			async () => {
				// const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

				const failures = await prisma.activity.findMany({
					where: {
						action: { contains: "archive" },
					},
					include: {
						organization: {
							select: { name: true },
						},
					},
				});

				return failures;
			}
		);

		if (failedActivities.length === 0) {
			return {
				healthy: true,
				message: "No failed archives in the last hour",
			};
		}

		// Send notification alerts
		await step.run("create-failure-notifications", async () => {
			const orgIds = [
				...new Set(failedActivities.map((a) => a.organizationId)),
			];

			for (const orgId of orgIds) {
				const admins = await prisma.member.findMany({
					where: {
						organizationId: orgId,
						role: { in: ["OWNER", "ADMIN"] },
					},
					select: { userId: true },
				});

				const orgFailures = failedActivities.filter(
					(a) => a.organizationId === orgId
				);

				await Promise.all(
					admins.map((admin) =>
						prisma.notification.create({
							data: {
								userId: admin.userId,
								type: "INTEGRATION_ERROR",
								title: "Archive operation failures detected",
								message: `${orgFailures.length} recent archive operation(s) failed.`,
								// actionUrl: "/activity",
								metadata: {
									failureCount: orgFailures.length,
									recentFailures: orgFailures.map((f) => ({
										action: f.action,
										timestamp: f.createdAt,
									})),
								},
							},
						})
					)
				);
			}

			logger.error(
				`Created failure notifications for ${orgIds.length} organizations`
			);
		});

		return {
			healthy: false,
			failureCount: failedActivities.length,
			failures: failedActivities.map((f) => ({
				organizationName: f.organization?.name,
				action: f.action,
				timestamp: f.createdAt,
				error: (f.metadata as any)?.error,
			})),
		};
	}
);
