/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/connector-service.ts

import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import { AuditData, FileData, UserData } from "@/lib/connectors/types";

export class ConnectorService {
	/**
	 * Sync data from a specific integration
	 */
	async syncIntegration(
		organizationId: string,
		source: ToolSource
	): Promise<AuditData> {
		const integration = await prisma.toolIntegration.findUnique({
			where: {
				organizationId_source: { organizationId, source },
			},
		});

		if (!integration) {
			throw new Error(`Integration ${source} not found`);
		}

		if (!integration.isActive) {
			throw new Error(`Integration ${source} is not active`);
		}

		await prisma.toolIntegration.update({
			where: { id: integration.id },
			data: { syncStatus: "SYNCING" },
		});

		try {
			const connector = ConnectorFactory.create(source, {
				accessToken: integration.accessToken,
				refreshToken: integration.refreshToken || undefined,
				organizationId,
			});

			const auditData = await connector.fetchAuditData();

			await prisma.toolIntegration.update({
				where: { id: integration.id },
				data: {
					lastSyncedAt: new Date(),
					syncStatus: "IDLE",
					lastError: null,
					lastErrorAt: null,
				},
			});

			return auditData;
		} catch (error: any) {
			await prisma.toolIntegration.update({
				where: { id: integration.id },
				data: {
					syncStatus: "ERROR",
					lastError: error.message,
					lastErrorAt: new Date(),
				},
			});

			throw error;
		}
	}

	/**
	 * Sync all active integrations for an organization
	 */
	async syncAllIntegrations(
		organizationId: string
	): Promise<Map<ToolSource, AuditData>> {
		const integrations = await prisma.toolIntegration.findMany({
			where: {
				organizationId,
				isActive: true,
			},
		});

		const results = new Map<ToolSource, AuditData>();

		await Promise.allSettled(
			integrations.map(async (integration) => {
				try {
					const data = await this.syncIntegration(
						organizationId,
						integration.source
					);
					results.set(integration.source, data);
				} catch (error) {
					console.error(
						`Failed to sync ${integration.source}:`,
						error
					);
				}
			})
		);

		return results;
	}

	/**
	 * Run complete audit and save results to database
	 */
	async runAudit(organizationId: string): Promise<string> {
		// Sync all integrations
		const syncResults = await this.syncAllIntegrations(organizationId);

		// Aggregate results
		let totalStorage = 0;
		let totalFiles = 0;
		let totalUsers = 0;
		let activeUsers = 0;
		const allFiles: FileData[] = [];
		const allUsers: UserData[] = [];

		for (const [source, data] of syncResults) {
			totalStorage += data.storageUsedGb;
			totalFiles += data.files.length;
			totalUsers += data.users.length;
			activeUsers += data.activeUsers;
			allFiles.push(...data.files);
			allUsers.push(...data.users);
		}

		// Calculate metrics
		const storageWaste = this.calculateStorageWaste(allFiles);
		const licenseWaste = this.calculateLicenseWaste(allUsers, totalUsers);
		const score = this.calculateScore({
			storageWaste,
			duplicates: allFiles.filter((f) => f.isDuplicate).length,
			publicFiles: allFiles.filter((f) => f.isPubliclyShared).length,
			inactiveUsers: totalUsers - activeUsers,
		});

		// Create audit result with transaction
		const auditResult = await prisma.$transaction(async (tx) => {
			// 1. Create AuditResult
			const audit = await tx.auditResult.create({
				data: {
					organizationId,
					score,
					estimatedSavings: storageWaste + licenseWaste,
					storageWaste,
					licenseWaste,
					activeRisks: this.countRisks(allFiles, allUsers),
					criticalRisks: this.countCriticalRisks(allFiles, allUsers),
					moderateRisks: this.countModerateRisks(allFiles, allUsers),
				},
			});

			// 2. Save all files in batches (createMany doesn't support relations)
			if (allFiles.length > 0) {
				const fileBatches = this.chunkArray(allFiles, 500);
				for (const batch of fileBatches) {
					await tx.file.createMany({
						data: batch.map((f) => ({
							auditResultId: audit.id,
							name: f.name,
							sizeMb: f.sizeMb,
							type: f.type,
							source: f.source,
							mimeType: f.mimeType,
							fileHash: f.fileHash,
							url: f.url,
							path: f.path,
							lastAccessed: f.lastAccessed || new Date(),
							ownerEmail: f.ownerEmail,
							isPubliclyShared: f.isPubliclyShared,
							sharedWith: f.sharedWith,
							isDuplicate: f.isDuplicate,
							duplicateGroup: f.duplicateGroup,
						})),
						skipDuplicates: true,
					});
				}
			}

			// 3. Generate and save playbooks with items
			await this.generateAndSavePlaybooks(
				tx,
				audit.id,
				organizationId,
				allFiles,
				allUsers,
				syncResults
			);

			// 4. Save score trend for the month
			const month = new Date().toISOString().slice(0, 7); // YYYY-MM
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
					score,
					waste: storageWaste + licenseWaste,
					riskScore: this.countRisks(allFiles, allUsers),
					activeUsers,
					storageUsedGb: totalStorage,
					licenseCount: totalUsers,
				},
				update: {
					score,
					waste: storageWaste + licenseWaste,
					riskScore: this.countRisks(allFiles, allUsers),
					activeUsers,
					storageUsedGb: totalStorage,
					licenseCount: totalUsers,
				},
			});

			// 5. Log activity
			await tx.activity.create({
				data: {
					organizationId,
					action: "audit.run",
					metadata: {
						score,
						storageWaste,
						licenseWaste,
						totalFiles,
						totalUsers,
						activeUsers,
					},
				},
			});

			return audit;
		});

		return auditResult.id;
	}

	/**
	 * Generate and save playbooks with proper transaction handling
	 */
	private async generateAndSavePlaybooks(
		tx: any,
		auditResultId: string,
		organizationId: string,
		files: FileData[],
		users: UserData[],
		syncResults: Map<ToolSource, AuditData>
	): Promise<void> {
		for (const [source, data] of syncResults) {
			// Playbook 1: Duplicate files
			const duplicates = data.files.filter((f) => f.isDuplicate);
			if (duplicates.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Remove ${duplicates.length} Duplicate Files`,
						description: `Found ${duplicates.length} duplicate files wasting storage space`,
						impact: `Save ${Math.round(duplicates.reduce((sum, f) => sum + f.sizeMb, 0) / 1024)} GB`,
						impactType: "SAVINGS",
						source,
						itemsCount: duplicates.length,
						riskLevel: "LOW",
						estimatedSavings:
							this.calculateStorageWaste(duplicates),
					},
				});

				// Save playbook items in batches
				const itemBatches = this.chunkArray(duplicates, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.fileHash,
							metadata: {
								size: f.sizeMb,
								path: f.path,
								url: f.url,
								source: f.source,
							},
						})),
					});
				}
			}

			// Playbook 2: Public files
			const publicFiles = data.files.filter((f) => f.isPubliclyShared);
			if (publicFiles.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Secure ${publicFiles.length} Publicly Shared Files`,
						description: `Found ${publicFiles.length} files that are publicly accessible`,
						impact: `Reduce security risks`,
						impactType: "SECURITY",
						source,
						itemsCount: publicFiles.length,
						riskLevel: publicFiles.some(
							(f) => f.type === "DATABASE"
						)
							? "CRITICAL"
							: "HIGH",
					},
				});

				const itemBatches = this.chunkArray(publicFiles, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.url || f.fileHash,
							metadata: {
								url: f.url,
								sharedWith: f.sharedWith,
								type: f.type,
								source: f.source,
							},
						})),
					});
				}
			}

			// Playbook 3: Inactive users
			const inactiveUsers = data.users.filter(
				(u) =>
					u.lastActive &&
					u.lastActive <
						new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
			);
			if (inactiveUsers.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Remove ${inactiveUsers.length} Inactive Users`,
						description: `Found ${inactiveUsers.length} users inactive for 90+ days`,
						impact: `Save $${inactiveUsers.length * 15}/month`,
						impactType: "SAVINGS",
						source,
						itemsCount: inactiveUsers.length,
						riskLevel: "MEDIUM",
						estimatedSavings: inactiveUsers.length * 15 * 12,
					},
				});

				const itemBatches = this.chunkArray(inactiveUsers, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((u) => ({
							playbookId: playbook.id,
							itemName: u.email,
							itemType: "user",
							externalId: u.email,
							metadata: {
								name: u.name,
								lastActive: u.lastActive,
								role: u.role,
								source,
							},
						})),
					});
				}
			}

			// Playbook 4: Old unused files (1+ year)
			const oldFiles = data.files.filter(
				(f) =>
					f.lastAccessed &&
					f.lastAccessed <
						new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
			);
			if (oldFiles.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Archive ${oldFiles.length} Old Unused Files`,
						description: `Files not accessed in over a year`,
						impact: `Save ${Math.round(oldFiles.reduce((sum, f) => sum + f.sizeMb, 0) / 1024)} GB`,
						impactType: "SAVINGS",
						source,
						itemsCount: oldFiles.length,
						riskLevel: "LOW",
						estimatedSavings: this.calculateStorageWaste(oldFiles),
					},
				});

				const itemBatches = this.chunkArray(oldFiles, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.url || f.fileHash,
							metadata: {
								size: f.sizeMb,
								lastAccessed: f.lastAccessed,
								path: f.path,
								source: f.source,
							},
						})),
					});
				}
			}

			// Playbook 5: Guest users (security risk)
			const guestUsers = data.users.filter((u) => u.isGuest);
			if (guestUsers.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Review ${guestUsers.length} Guest Users`,
						description: `Guest users have access to your workspace`,
						impact: `Reduce security risks`,
						impactType: "SECURITY",
						source,
						itemsCount: guestUsers.length,
						riskLevel: "HIGH",
					},
				});

				const itemBatches = this.chunkArray(guestUsers, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((u) => ({
							playbookId: playbook.id,
							itemName: u.email,
							itemType: "guest",
							externalId: u.email,
							metadata: {
								name: u.name,
								lastActive: u.lastActive,
								source,
							},
						})),
					});
				}
			}
		}
	}

	/**
	 * Execute a playbook and log results
	 */
	async executePlaybook(playbookId: string, userId: string): Promise<void> {
		const playbook = await prisma.playbook.findUnique({
			where: { id: playbookId },
			include: {
				items: true,
				organization: true,
			},
		});

		if (!playbook) {
			throw new Error("Playbook not found");
		}

		if (playbook.status !== "PENDING" && playbook.status !== "APPROVED") {
			throw new Error("Playbook cannot be executed");
		}

		const startTime = Date.now();

		await prisma.playbook.update({
			where: { id: playbookId },
			data: { status: "EXECUTING" },
		});

		try {
			const results = await this.performPlaybookActions(playbook);

			// Create audit log entry
			await prisma.auditLog.create({
				data: {
					organizationId: playbook.organizationId,
					playbookId: playbook.id,
					userId,
					actionType: this.mapPlaybookToActionType(
						playbook.impactType
					),
					target: playbook.title,
					targetType: "Playbook",
					executor: `User ${userId}`,
					status: "SUCCESS",
					details: {
						itemsProcessed: results.processed,
						itemsFailed: results.failed,
						executionTime: Date.now() - startTime,
					},
				},
			});

			// Update playbook with results
			await prisma.playbook.update({
				where: { id: playbookId },
				data: {
					status: "EXECUTED",
					executedAt: new Date(),
					executedBy: userId,
					executionTime: Date.now() - startTime,
					itemsProcessed: results.processed,
					itemsFailed: results.failed,
				},
			});

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: playbook.organizationId,
					userId,
					action: "playbook.executed",
					metadata: {
						playbookId: playbook.id,
						title: playbook.title,
						itemsProcessed: results.processed,
					},
				},
			});
		} catch (error: any) {
			await prisma.playbook.update({
				where: { id: playbookId },
				data: {
					status: "FAILED",
					executedAt: new Date(),
					executedBy: userId,
				},
			});

			await prisma.auditLog.create({
				data: {
					organizationId: playbook.organizationId,
					playbookId: playbook.id,
					userId,
					actionType: this.mapPlaybookToActionType(
						playbook.impactType
					),
					target: playbook.title,
					targetType: "Playbook",
					executor: `User ${userId}`,
					status: "FAILED",
					details: {
						error: error.message,
					},
				},
			});

			throw error;
		}
	}

	private async performPlaybookActions(
		playbook: any
	): Promise<{ processed: number; failed: number }> {
		// Placeholder for actual execution logic
		// In production, this would call the appropriate connector to perform actions
		return {
			processed: playbook.items.length,
			failed: 0,
		};
	}

	private mapPlaybookToActionType(impactType: string): any {
		switch (impactType) {
			case "SECURITY":
				return "UPDATE_PERMISSIONS";
			case "SAVINGS":
				return "DELETE_FILE";
			default:
				return "OTHER";
		}
	}

	private chunkArray<T>(array: T[], size: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += size) {
			chunks.push(array.slice(i, i + size));
		}
		return chunks;
	}

	private calculateScore(metrics: {
		storageWaste: number;
		duplicates: number;
		publicFiles: number;
		inactiveUsers: number;
	}): number {
		let score = 100;
		score -= Math.min(30, metrics.storageWaste / 100);
		score -= Math.min(20, metrics.duplicates / 10);
		score -= Math.min(25, metrics.publicFiles / 5);
		score -= Math.min(25, metrics.inactiveUsers / 5);
		return Math.max(0, Math.round(score));
	}

	private calculateStorageWaste(files: FileData[]): number {
		const totalMb = files.reduce((sum, f) => sum + f.sizeMb, 0);
		return Math.round((totalMb / 1024) * 0.1 * 12);
	}

	private calculateLicenseWaste(
		users: UserData[],
		totalUsers: number
	): number {
		const inactiveUsers = users.filter(
			(u) =>
				!u.lastActive ||
				u.lastActive < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
		).length;
		return Math.round(inactiveUsers * 15 * 12);
	}

	private countRisks(files: FileData[], users: UserData[]): number {
		return (
			files.filter((f) => f.isPubliclyShared).length +
			users.filter((u) => u.isGuest).length
		);
	}

	private countCriticalRisks(files: FileData[], users: UserData[]): number {
		return files.filter((f) => f.isPubliclyShared && f.type === "DATABASE")
			.length;
	}

	private countModerateRisks(files: FileData[], users: UserData[]): number {
		return (
			files.filter((f) => f.isPubliclyShared && f.type !== "DATABASE")
				.length + users.filter((u) => u.isGuest).length
		);
	}

	async testIntegrationConnection(
		organizationId: string,
		source: ToolSource
	): Promise<boolean> {
		const integration = await prisma.toolIntegration.findUnique({
			where: {
				organizationId_source: { organizationId, source },
			},
		});

		if (!integration) {
			throw new Error(`Integration ${source} not found`);
		}

		const connector = ConnectorFactory.create(source, {
			accessToken: integration.accessToken,
			refreshToken: integration.refreshToken || undefined,
			organizationId,
		});

		return connector.testConnection();
	}
}
