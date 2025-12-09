/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/connector-service.ts

import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import {
	AuditData,
	BaseConnector,
	FileData,
	UserData,
} from "@/lib/connectors/types";
import { PlaybookWithItems } from "@/types/audit";
import { logger } from "@/lib/logger";

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
				metadata: integration.metadata as Record<string, any>,
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
					logger.error(
						`Failed to sync ${integration.source}:`,
						error
					);
				}
			})
		);

		return results;
	}

	/**
	 * Save files to database with proper validation and error handling
	 */
	private async saveFilesToDatabase(
		tx: any,
		auditResultId: string,
		files: FileData[]
	): Promise<void> {
		if (files.length === 0) return;

		// Validate and sanitize file data before saving
		const sanitizedFiles = files.map((f) => ({
			auditResultId,
			name: f.name || "Unknown",
			sizeMb: f.sizeMb || 0,
			type: f.type, // Already a valid FileType enum
			source: f.source, // Already a valid ToolSource enum
			mimeType: f.mimeType || null,
			fileHash: f.fileHash || null,
			externalId: f.externalId || null, // CRITICAL: Must be saved for deletion/updates
			url: f.url || null,
			path: f.path || null,
			lastAccessed: f.lastAccessed || new Date(), // Prisma requires DateTime (non-nullable in schema)
			ownerEmail: f.ownerEmail || null,
			isPubliclyShared: f.isPubliclyShared ?? false,
			sharedWith: f.sharedWith || [],
			isDuplicate: f.isDuplicate ?? false,
			duplicateGroup: f.duplicateGroup || null,
			status: "ACTIVE" as const, // Default to ACTIVE
		}));

		// Save files in batches to avoid query size limits
		const fileBatches = this.chunkArray(sanitizedFiles, 500);

		for (const batch of fileBatches) {
			await tx.file.createMany({
				data: batch,
				skipDuplicates: true, // Skip if duplicate constraint violation
			});
		}
	}

	/**
	 * Generate and save playbooks with proper transaction handling
	 */
	private async generateAndSavePlaybooks(
		tx: any,
		auditResultId: string,
		organizationId: string,
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

				// Save playbook items with CORRECT externalId (not fileHash!)
				const itemBatches = this.chunkArray(duplicates, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.externalId, // CRITICAL: Use externalId (e.g., Dropbox file ID)
							metadata: {
								size: f.sizeMb,
								path: f.path,
								url: f.url,
								source: f.source,
								fileHash: f.fileHash, // Store hash in metadata for reference
								duplicateGroup: f.duplicateGroup,
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
							externalId: f.externalId, // CRITICAL: Use externalId for API operations
							metadata: {
								url: f.url,
								sharedWith: f.sharedWith,
								type: f.type,
								source: f.source,
								path: f.path,
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
							externalId: f.externalId, // CRITICAL: Use externalId
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
					) as any,
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
					) as any,
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

	async performPlaybookActions(
		playbook: PlaybookWithItems
	): Promise<{ processed: number; failed: number }> {
		// Fetch integration and create connector for the playbook's source
		const integration = await prisma.toolIntegration.findUnique({
			where: {
				organizationId_source: {
					organizationId: playbook.organizationId,
					source: playbook.source,
				},
			},
		});

		let connector: BaseConnector | null = null;
		if (integration) {
			try {
				connector = ConnectorFactory.create(playbook.source, {
					accessToken: integration.accessToken,
					refreshToken: integration.refreshToken || undefined,
					organizationId: playbook.organizationId,
					metadata: integration.metadata as Record<string, any>,
				});
			} catch (err) {
				logger.warn(`Connector creation failed for execution: ${err}`);
				connector = null;
			}
		}

		let processed = 0;
		let failed = 0;

		const items = Array.isArray(playbook.items) ? playbook.items : [];

		for (const item of items) {
			// Skip items that are not selected
			if (item.isSelected === false) continue;

			const actionType = this.mapPlaybookToActionType(
				playbook.impactType as string
			);

			try {
				if (!connector) {
					// No connector available; log and treat as best-effort processed
					logger.info(
						`No integration connector found for organization ${playbook.organizationId} source ${playbook.source}. Marking item as processed (best-effort).`
					);
					processed += 1;
					continue;
				}

				// Execute action based on mapped action type
				switch (actionType) {
					case "DELETE_FILE":
						await connector.deleteFile(
							item.externalId || "",
							(item.metadata as Record<string, any>) || {}
						);
						break;

					case "UPDATE_PERMISSIONS":
						await connector.updatePermissions(
							item.externalId || "",
							(item.metadata as Record<string, any>) || {}
						);
						break;

					case "ARCHIVE_CHANNEL":
						await connector.archiveChannel(
							item.externalId || "",
							(item.metadata as Record<string, any>) || {}
						);
						break;

					case "REMOVE_GUEST":
						await connector.removeGuest(
							item.externalId || "",
							(item.metadata as Record<string, any>) || {}
						);
						break;

					case "REVOKE_ACCESS":
						// REVOKE_ACCESS is treated as UPDATE_PERMISSIONS for now
						await connector.updatePermissions(
							item.externalId || "",
							(item.metadata as Record<string, any>) || {}
						);
						break;

					default:
						// Unknown action type; log and mark as processed
						logger.info(
							`Unknown action type ${actionType} for playbook, skipping execution`
						);
				}

				processed += 1;
			} catch (err: any) {
				logger.error("Playbook item action failed:", {
					item,
					err,
					actionType,
				});

				// If the connector explicitly does not implement the action,
				// bubble the error up so the route returns a 500 and the client
				// can display the precise error via toast.
				const message = err && (err.message || String(err));
				if (
					typeof message === "string" &&
					/not implemented/i.test(message)
				) {
					throw new Error(message);
				}

				failed += 1;
			}
		}

		return { processed, failed };
	}

	private mapPlaybookToActionType(impactType: string): string {
		switch (impactType) {
			case "SECURITY":
				// For security risks, prioritize revoking access and updating permissions
				return "REVOKE_ACCESS";
			case "SAVINGS":
				// For storage/cost savings, delete or archive files
				return "DELETE_FILE";
			case "EFFICIENCY":
				// For efficiency, archive channels or pages
				return "ARCHIVE_CHANNEL";
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
		_totalUsers: number
	): number {
		void _totalUsers;
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

	private countCriticalRisks(files: FileData[], _users: UserData[]): number {
		void _users;
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
			metadata: integration.metadata as Record<string, any>,
		});

		return connector.testConnection();
	}
}
