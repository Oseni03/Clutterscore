// lib/inngest/functions/run-audit.ts
import { inngest } from "../client";
import { ConnectorService } from "@/server/connector-service";
import { prisma } from "@/lib/prisma";
import { AuditData, FileData, UserData } from "@/lib/connectors/types";
import { ToolSource } from "@prisma/client";

const connectorService = new ConnectorService();

export const runAuditJob = inngest.createFunction(
	{
		id: "run-audit",
		name: "Run Organization Audit",
		retries: 2,
	},
	{ event: "audit/run" },
	async ({ event, step }) => {
		const { organizationId, userId } = event.data;

		// Step 1: Sync all integrations
		// NOTE: Map will be serialized to object by Inngest
		const syncResultsRaw = await step.run("sync-integrations", async () => {
			const results =
				await connectorService.syncAllIntegrations(organizationId);
			// Convert Map to plain object for JSON serialization
			return Object.fromEntries(results);
		});

		// Step 2: Aggregate and rehydrate data
		const aggregatedData = await step.run("aggregate-data", async () => {
			let totalStorage = 0;
			let totalFiles = 0;
			let totalUsers = 0;
			let activeUsers = 0;
			const allFiles: FileData[] = [];
			const allUsers: UserData[] = [];

			// Iterate over plain object (Inngest serialized the Map)
			for (const [source, data] of Object.entries(syncResultsRaw) as [
				ToolSource,
				AuditData,
			][]) {
				totalStorage += data.storageUsedGb;
				totalFiles += data.files.length;
				totalUsers += data.users.length;
				activeUsers += data.activeUsers;

				// Rehydrate Date objects for files
				const rehydratedFiles: FileData[] = data.files.map((file) => ({
					...file,
					lastAccessed: file.lastAccessed
						? new Date(file.lastAccessed)
						: undefined,
				}));

				// Rehydrate Date objects for users
				const rehydratedUsers: UserData[] = data.users.map((user) => ({
					...user,
					lastActive: user.lastActive
						? new Date(user.lastActive)
						: undefined,
				}));

				allFiles.push(...rehydratedFiles);
				allUsers.push(...rehydratedUsers);
			}

			return {
				totalStorage,
				totalFiles,
				totalUsers,
				activeUsers,
				allFiles,
				allUsers,
			};
		});

		// Step 3: Calculate metrics
		const metrics = await step.run("calculate-metrics", async () => {
			const storageWaste = connectorService["calculateStorageWaste"](
				aggregatedData.allFiles as FileData[]
			);
			const licenseWaste = connectorService["calculateLicenseWaste"](
				aggregatedData.allUsers as UserData[],
				aggregatedData.totalUsers
			);
			const score = connectorService["calculateScore"]({
				storageWaste,
				duplicates: aggregatedData.allFiles.filter((f) => f.isDuplicate)
					.length,
				publicFiles: aggregatedData.allFiles.filter(
					(f) => f.isPubliclyShared
				).length,
				inactiveUsers:
					aggregatedData.totalUsers - aggregatedData.activeUsers,
			});

			return {
				score,
				storageWaste,
				licenseWaste,
				activeRisks: connectorService["countRisks"](
					aggregatedData.allFiles as FileData[],
					aggregatedData.allUsers as UserData[]
				),
				criticalRisks: connectorService["countCriticalRisks"](
					aggregatedData.allFiles as FileData[],
					aggregatedData.allUsers as UserData[]
				),
				moderateRisks: connectorService["countModerateRisks"](
					aggregatedData.allFiles as FileData[],
					aggregatedData.allUsers as UserData[]
				),
			};
		});

		// Step 4: Save everything to database in a single transaction
		const auditResultId = await step.run("save-to-database", async () => {
			return await prisma.$transaction(async (tx) => {
				// 1. Create AuditResult
				const audit = await tx.auditResult.create({
					data: {
						organizationId,
						score: metrics.score,
						estimatedSavings:
							metrics.storageWaste + metrics.licenseWaste,
						storageWaste: metrics.storageWaste,
						licenseWaste: metrics.licenseWaste,
						activeRisks: metrics.activeRisks,
						criticalRisks: metrics.criticalRisks,
						moderateRisks: metrics.moderateRisks,
					},
				});

				// 2. Save all files
				await connectorService["saveFilesToDatabase"](
					tx,
					audit.id,
					aggregatedData.allFiles as FileData[]
				);

				// 3. Generate and save playbooks
				// Convert plain object back to Map with rehydrated dates
				const syncResultsMap = new Map<ToolSource, AuditData>();

				for (const [source, data] of Object.entries(syncResultsRaw) as [
					ToolSource,
					AuditData,
				][]) {
					// Rehydrate dates in the data
					const rehydratedData: AuditData = {
						...data,
						files: data.files.map((file) => ({
							...file,
							lastAccessed: file.lastAccessed
								? new Date(file.lastAccessed)
								: undefined,
						})),
						users: data.users.map((user) => ({
							...user,
							lastActive: user.lastActive
								? new Date(user.lastActive)
								: undefined,
						})),
						channels: data.channels?.map((channel) => ({
							...channel,
							lastActivity: channel.lastActivity
								? new Date(channel.lastActivity)
								: undefined,
						})),
					};

					syncResultsMap.set(source, rehydratedData);
				}

				await connectorService["generateAndSavePlaybooks"](
					tx,
					audit.id,
					organizationId,
					syncResultsMap
				);

				// 4. Save score trend for the month
				const month = new Date().toISOString().slice(0, 7);
				await tx.scoreTrend.upsert({
					where: {
						organizationId_month: {
							organizationId,
							month,
						},
					},
					create: {
						organizationId,
						month,
						score: metrics.score,
						waste: metrics.storageWaste + metrics.licenseWaste,
						riskScore: metrics.activeRisks,
						activeUsers: aggregatedData.activeUsers,
						storageUsedGb: aggregatedData.totalStorage,
						licenseCount: aggregatedData.totalUsers,
					},
					update: {
						score: metrics.score,
						waste: metrics.storageWaste + metrics.licenseWaste,
						riskScore: metrics.activeRisks,
						activeUsers: aggregatedData.activeUsers,
						storageUsedGb: aggregatedData.totalStorage,
						licenseCount: aggregatedData.totalUsers,
					},
				});

				// 5. Log activity
				await tx.activity.create({
					data: {
						organizationId,
						userId,
						action: "audit.run",
						metadata: {
							score: metrics.score,
							storageWaste: metrics.storageWaste,
							licenseWaste: metrics.licenseWaste,
							totalFiles: aggregatedData.totalFiles,
							totalUsers: aggregatedData.totalUsers,
							activeUsers: aggregatedData.activeUsers,
							auditResultId: audit.id,
						},
					},
				});

				return audit.id;
			});
		});

		// Step 5: Send notification
		await step.run("send-notification", async () => {
			await prisma.notification.create({
				data: {
					userId,
					type: "AUDIT_COMPLETE",
					title: "Audit Complete",
					message: `Your workspace audit is ready with a score of ${metrics.score}`,
					actionUrl: `/dashboard/audit/${auditResultId}`,
				},
			});
		});

		return {
			auditId: auditResultId,
			success: true,
			score: metrics.score,
			estimatedSavings: metrics.storageWaste + metrics.licenseWaste,
		};
	}
);
