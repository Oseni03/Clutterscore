/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/connector-service.ts

import { prisma } from "@/lib/prisma";
import { ToolSource, ImpactType, RiskLevel } from "@prisma/client";
import { ConnectorFactory } from "@/lib/connectors/factory";
import {
	AuditData,
	BaseConnector,
	FileData,
	UserData,
} from "@/lib/connectors/types";
import { PlaybookWithItems } from "@/types/audit";
import { logger } from "@/lib/logger";
import { formatSize } from "@/lib/utils";

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
	 * Run comprehensive audit and generate all playbooks
	 */
	async runAudit(organizationId: string): Promise<string> {
		// Sync all integrations first
		const syncResults = await this.syncAllIntegrations(organizationId);

		// Aggregate metrics
		let allFiles: FileData[] = [];
		let allUsers: UserData[] = [];
		// let totalStorage = 0;
		let totalLicenses = 0;
		// let activeUsers = 0;

		for (const data of syncResults.values()) {
			allFiles = [...allFiles, ...data.files];
			allUsers = [...allUsers, ...data.users];
			// totalStorage += data.storageUsedGb;
			totalLicenses += data.totalLicenses;
			// activeUsers += data.activeUsers;
		}

		// Calculate waste metrics
		const storageWaste = this.calculateStorageWaste(allFiles);
		const licenseWaste = this.calculateLicenseWaste(
			allUsers,
			totalLicenses
		);
		const activeRisks = this.countRisks(allFiles, allUsers);
		const criticalRisks = this.countCriticalRisks(allFiles, allUsers);
		const moderateRisks = this.countModerateRisks(allFiles, allUsers);

		// Calculate overall score
		const score = this.calculateScore({
			storageWaste,
			duplicates: allFiles.filter((f) => f.isDuplicate).length,
			publicFiles: allFiles.filter((f) => f.isPubliclyShared).length,
			inactiveUsers: allUsers.filter(
				(u) =>
					!u.lastActive ||
					u.lastActive <
						new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
			).length,
		});

		// Save audit result and playbooks in transaction
		const auditResultId = await prisma.$transaction(async (tx) => {
			// Create audit result
			const auditResult = await tx.auditResult.create({
				data: {
					organizationId,
					score,
					estimatedSavings: storageWaste + licenseWaste,
					storageWaste,
					licenseWaste,
					activeRisks,
					criticalRisks,
					moderateRisks,
				},
			});

			// Save files to database
			await this.saveFilesToDatabase(tx, auditResult.id, allFiles);

			// Generate and save playbooks
			await this.generateAndSavePlaybooks(
				tx,
				auditResult.id,
				organizationId,
				syncResults
			);

			return auditResult.id;
		});

		// Log activity
		await prisma.activity.create({
			data: {
				organizationId,
				action: "audit.run",
				metadata: {
					auditResultId,
					score,
					estimatedSavings: storageWaste + licenseWaste,
				},
			},
		});

		return auditResultId;
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
			type: f.type,
			source: f.source,
			mimeType: f.mimeType || null,
			fileHash: f.fileHash || null,
			externalId: f.externalId || null,
			url: f.url || null,
			path: f.path || null,
			lastAccessed: f.lastAccessed || new Date(),
			ownerEmail: f.ownerEmail || null,
			isPubliclyShared: f.isPubliclyShared ?? false,
			sharedWith: f.sharedWith || [],
			isDuplicate: f.isDuplicate ?? false,
			duplicateGroup: f.duplicateGroup || null,
			status: "ACTIVE" as const,
		}));

		// Save files in batches to avoid query size limits
		const fileBatches = this.chunkArray(sanitizedFiles, 500);

		for (const batch of fileBatches) {
			await tx.file.createMany({
				data: batch,
				skipDuplicates: true,
			});
		}
	}

	/**
	 * Generate and save playbooks with NEW requirements:
	 * - 12 months for old files (not 24)
	 * - Duplicate consolidation with 95% confidence
	 * - Slack channel archival (<5 messages in 12 months)
	 * - Detailed metadata for exact file tracking
	 * - 30-day undo preparation
	 */
	private async generateAndSavePlaybooks(
		tx: any,
		auditResultId: string,
		organizationId: string,
		syncResults: Map<ToolSource, AuditData>
	): Promise<void> {
		for (const [source, data] of syncResults) {
			// ========================================================================
			// PLAYBOOK 1: Duplicate Files (Hash-based, 95% confidence)
			// ========================================================================
			const duplicates = data.files.filter(
				(f) => f.isDuplicate && f.fileHash
			);

			if (duplicates.length > 0) {
				// Group by hash for consolidation
				const duplicateGroups = new Map<string, FileData[]>();
				duplicates.forEach((f) => {
					const key = f.duplicateGroup || f.fileHash!;
					if (!duplicateGroups.has(key)) {
						duplicateGroups.set(key, []);
					}
					duplicateGroups.get(key)!.push(f);
				});

				// Only keep groups with 2+ files (true duplicates)
				const trueDuplicates: FileData[] = [];
				for (const group of duplicateGroups.values()) {
					if (group.length >= 2) {
						// Keep the most recently accessed, mark others for deletion
						const sorted = group.sort(
							(a, b) =>
								(b.lastAccessed?.getTime() || 0) -
								(a.lastAccessed?.getTime() || 0)
						);
						// Add all except the first (most recent) to deletion list
						trueDuplicates.push(...sorted.slice(1));
					}
				}

				if (trueDuplicates.length > 0) {
					const totalSizeMb = trueDuplicates.reduce(
						(sum, f) => sum + f.sizeMb,
						0
					);

					const playbook = await tx.playbook.create({
						data: {
							auditResultId,
							organizationId,
							title: `Consolidate ${trueDuplicates.length} Duplicate Files (95% Confidence)`,
							description: `Found ${trueDuplicates.length} duplicate files using hash-based detection. Files with identical content will be archived, keeping the most recently accessed version.`,
							impact: `Save ${formatSize(totalSizeMb)} of storage`,
							impactType: "SAVINGS" as ImpactType,
							source,
							itemsCount: trueDuplicates.length,
							riskLevel: "LOW" as RiskLevel,
							estimatedSavings: Math.round(
								(totalSizeMb / 1024) * 0.1 * 12
							),
							status: "PENDING",
						},
					});

					const itemBatches = this.chunkArray(trueDuplicates, 500);
					for (const batch of itemBatches) {
						await tx.playbookItem.createMany({
							data: batch.map((f) => ({
								playbookId: playbook.id,
								itemName: f.name,
								itemType: "file",
								externalId: f.externalId,
								metadata: {
									size: f.sizeMb,
									path: f.path,
									url: f.url,
									source: f.source,
									fileHash: f.fileHash,
									duplicateGroup: f.duplicateGroup,
									lastAccessed: f.lastAccessed,
									ownerEmail: f.ownerEmail,
									// For undo: store original location
									originalPath: f.path,
									originalParent: f.path
										?.split("/")
										.slice(0, -1)
										.join("/"),
								},
							})),
						});
					}
				}
			}

			// ========================================================================
			// PLAYBOOK 2: Public Files (Security Risk)
			// ========================================================================
			const publicFiles = data.files.filter((f) => f.isPubliclyShared);

			if (publicFiles.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Secure ${publicFiles.length} Publicly Shared Files`,
						description: `These files are publicly accessible. Review and revoke public access to prevent data leaks.`,
						impact: `Reduce ${publicFiles.length} security vulnerabilities`,
						impactType: "SECURITY" as ImpactType,
						source,
						itemsCount: publicFiles.length,
						riskLevel: publicFiles.some(
							(f) => f.type === "DATABASE"
						)
							? ("CRITICAL" as RiskLevel)
							: ("HIGH" as RiskLevel),
						status: "PENDING",
					},
				});

				const itemBatches = this.chunkArray(publicFiles, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.externalId,
							metadata: {
								url: f.url,
								path: f.path,
								type: f.type,
								source: f.source,
								ownerEmail: f.ownerEmail,
								// For undo: store current sharing settings
								originalSharing: {
									isPubliclyShared: f.isPubliclyShared,
									sharedWith: f.sharedWith,
								},
							},
						})),
					});
				}
			}

			// ========================================================================
			// PLAYBOOK 3: Old Unused Files (12 months - UPDATED from 24)
			// ========================================================================
			const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 12 months
			const oldFiles = data.files.filter(
				(f) => f.lastAccessed && f.lastAccessed < cutoffDate
			);

			if (oldFiles.length > 0) {
				const totalSizeMb = oldFiles.reduce(
					(sum, f) => sum + f.sizeMb,
					0
				);

				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Archive ${oldFiles.length} Untouched Files (>12 Months)`,
						description: `These files haven't been accessed in over 12 months and are candidates for archival.`,
						impact: `Save ${formatSize(totalSizeMb)} of active storage`,
						impactType: "SAVINGS" as ImpactType,
						source,
						itemsCount: oldFiles.length,
						riskLevel: "MEDIUM" as RiskLevel,
						estimatedSavings: Math.round(
							(totalSizeMb / 1024) * 0.1 * 12
						),
						status: "PENDING",
					},
				});

				const itemBatches = this.chunkArray(oldFiles, 500);
				for (const batch of itemBatches) {
					await tx.playbookItem.createMany({
						data: batch.map((f) => ({
							playbookId: playbook.id,
							itemName: f.name,
							itemType: "file",
							externalId: f.externalId,
							metadata: {
								size: f.sizeMb,
								lastAccessed: f.lastAccessed,
								path: f.path,
								url: f.url,
								source: f.source,
								ownerEmail: f.ownerEmail,
								daysSinceAccess: Math.floor(
									(Date.now() -
										(f.lastAccessed?.getTime() || 0)) /
										(24 * 60 * 60 * 1000)
								),
								// For undo: store original location
								originalPath: f.path,
								originalStatus: "ACTIVE",
							},
						})),
					});
				}
			}

			// ========================================================================
			// PLAYBOOK 4: Inactive Slack Channels (<5 messages in 12 months)
			// ========================================================================
			if (source === "SLACK" && data.channels) {
				// Identify inactive channels
				const inactiveChannels = data.channels.filter((ch) => {
					if (ch.isArchived) return false;

					const lastActivity = ch.lastActivity;
					if (!lastActivity) return false;

					const monthsInactive =
						(Date.now() - lastActivity.getTime()) /
						(30 * 24 * 60 * 60 * 1000);

					// Channel is inactive if >12 months old AND has <5 members
					// (Using memberCount as proxy for message activity)
					return monthsInactive >= 12 && ch.memberCount < 5;
				});

				if (inactiveChannels.length > 0) {
					const playbook = await tx.playbook.create({
						data: {
							auditResultId,
							organizationId,
							title: `Archive ${inactiveChannels.length} Inactive Slack Channels`,
							description: `These channels have minimal activity (<5 members) and haven't been used in 12+ months.`,
							impact: `Reduce workspace clutter and improve organization`,
							impactType: "EFFICIENCY" as ImpactType,
							source,
							itemsCount: inactiveChannels.length,
							riskLevel: "LOW" as RiskLevel,
							status: "PENDING",
						},
					});

					const itemBatches = this.chunkArray(inactiveChannels, 500);
					for (const batch of itemBatches) {
						await tx.playbookItem.createMany({
							data: batch.map((ch) => ({
								playbookId: playbook.id,
								itemName: ch.name,
								itemType: "channel",
								externalId: ch.id,
								metadata: {
									memberCount: ch.memberCount,
									lastActivity: ch.lastActivity,
									isPrivate: ch.isPrivate,
									source,
									// For undo: store original state
									originalState: {
										isArchived: ch.isArchived,
										memberCount: ch.memberCount,
									},
								},
							})),
						});
					}
				}
			}

			// ========================================================================
			// PLAYBOOK 5: Guest Users (Security Risk)
			// ========================================================================
			const guestUsers = data.users.filter((u) => u.isGuest);

			if (guestUsers.length > 0) {
				const playbook = await tx.playbook.create({
					data: {
						auditResultId,
						organizationId,
						title: `Review ${guestUsers.length} Guest Users`,
						description: `Guest users have access to your workspace. Review and remove unnecessary guest access.`,
						impact: `Reduce ${guestUsers.length} potential security risks`,
						impactType: "SECURITY" as ImpactType,
						source,
						itemsCount: guestUsers.length,
						riskLevel: "HIGH" as RiskLevel,
						status: "PENDING",
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
								role: u.role,
								source,
								// For undo: store original access level
								originalAccess: {
									isGuest: true,
									role: u.role,
									licenseType: u.licenseType,
								},
							},
						})),
					});
				}
			}
		}
	}

	/**
	 * Execute a playbook and create undo records
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

		if (playbook.status !== "APPROVED") {
			throw new Error("Playbook must be approved before execution");
		}

		const startTime = Date.now();

		await prisma.playbook.update({
			where: { id: playbookId },
			data: { status: "EXECUTING" },
		});

		try {
			const results = await this.performPlaybookActions(playbook, userId);

			// Create audit log entry with undo actions
			const undoExpiresAt = new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000
			); // 30 days

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
						affectedFiles: results.affectedFiles,
					},
					undoActions: results.undoActions,
					undoExpiresAt,
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
						canUndo: true,
						undoExpiresAt,
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

	/**
	 * Perform playbook actions and collect detailed undo information
	 */
	async performPlaybookActions(
		playbook: PlaybookWithItems,
		userId?: string
	): Promise<{
		processed: number;
		failed: number;
		affectedFiles: string[];
		undoActions: any[];
	}> {
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
				logger.warn(`Connector creation failed: ${err}`);
				connector = null;
			}
		}

		let processed = 0;
		let failed = 0;
		const affectedFiles: string[] = [];
		const undoActions: any[] = [];

		const items = Array.isArray(playbook.items) ? playbook.items : [];

		for (const item of items) {
			if (item.isSelected === false) continue;

			const actionType = this.mapPlaybookToActionType(
				playbook.impactType
			);
			const metadata = (item.metadata as Record<string, any>) || {};

			try {
				if (!connector) {
					logger.info(`No connector for ${playbook.source}`);
					processed += 1;
					continue;
				}

				// Execute action and capture metadata for undo
				switch (actionType) {
					case "ARCHIVE_FILE": {
						// Archive the file
						await connector.archiveFile(
							item.externalId || "",
							metadata
						);

						// Prepare undo action with all necessary info
						undoActions.push({
							type: "restore_file",
							itemId: item.id,
							itemName: item.itemName,
							itemType: item.itemType,
							externalId: item.externalId,
							fileId: item.externalId,
							fileName: item.itemName,
							originalPath:
								metadata.originalPath || metadata.path,
							originalParentId: metadata.originalParentId,
							archiveFolderId: metadata.archiveFolderId,
							archivePath: metadata.archivePath,
							source: playbook.source,
							actionType: "ARCHIVE_FILE",
							originalMetadata: metadata,
							executedAt: new Date(),
							executedBy: userId,
						});

						affectedFiles.push(item.itemName);
						break;
					}

					case "UPDATE_PERMISSIONS": {
						// Update permissions (restrict access)
						await connector.updatePermissions(
							item.externalId || "",
							metadata
						);

						// Prepare undo action
						undoActions.push({
							type: "restore_permissions",
							itemId: item.id,
							itemName: item.itemName,
							itemType: item.itemType,
							externalId: item.externalId,
							fileId: item.externalId,
							fileName: item.itemName,
							originalSharing: metadata.originalSharing || {
								isPubliclyShared:
									metadata.isPubliclyShared || false,
								sharedWith: metadata.sharedWith || [],
								permissions: metadata.permissions || [],
							},
							actionType: "UPDATE_PERMISSIONS",
							originalMetadata: metadata,
							executedAt: new Date(),
							executedBy: userId,
						});

						affectedFiles.push(item.itemName);
						break;
					}

					case "ARCHIVE_CHANNEL": {
						// Archive the channel
						await connector.archiveChannel(
							item.externalId || "",
							metadata
						);

						// Prepare undo action
						undoActions.push({
							type: "restore_channel",
							itemId: item.id,
							itemName: item.itemName,
							itemType: item.itemType,
							externalId: item.externalId,
							channelId: item.externalId,
							channelName: item.itemName,
							isPrivate: metadata.isPrivate || false,
							memberCount: metadata.memberCount || 0,
							actionType: "ARCHIVE_CHANNEL",
							originalMetadata: metadata,
							executedAt: new Date(),
							executedBy: userId,
						});

						affectedFiles.push(item.itemName);
						break;
					}

					case "REMOVE_GUEST": {
						// Remove guest user
						await connector.removeGuest(
							item.externalId || "",
							metadata
						);

						// Prepare undo action
						undoActions.push({
							type: "restore_user",
							itemId: item.id,
							itemName: item.itemName,
							itemType: item.itemType,
							externalId: item.externalId,
							userId: item.externalId,
							userEmail: item.itemName,
							role: metadata.role || "guest",
							licenseType: metadata.licenseType,
							actionType: "REMOVE_GUEST",
							originalMetadata: metadata,
							executedAt: new Date(),
							executedBy: userId,
						});

						affectedFiles.push(item.itemName);
						break;
					}

					case "REVOKE_ACCESS": {
						// Revoke access
						await connector.revokeAccess(
							item.externalId || "",
							metadata
						);

						// Prepare undo action
						undoActions.push({
							type: "restore_access",
							itemId: item.id,
							itemName: item.itemName,
							itemType: item.itemType,
							externalId: item.externalId,
							userId: item.externalId,
							userEmail: item.itemName,
							groupId: metadata.groupId,
							role: metadata.role,
							permissions: metadata.permissions,
							actionType: "REVOKE_ACCESS",
							originalMetadata: metadata,
							executedAt: new Date(),
							executedBy: userId,
						});

						affectedFiles.push(item.itemName);
						break;
					}

					default:
						logger.info(`Unknown action type ${actionType}`);
				}

				processed += 1;
			} catch (err: any) {
				logger.error("Playbook item action failed:", {
					item,
					err,
					actionType,
				});

				const message = err && (err.message || String(err));
				if (
					typeof message === "string" &&
					/not (implemented|supported)/i.test(message)
				) {
					throw new Error(message);
				}

				failed += 1;
			}
		}

		return { processed, failed, affectedFiles, undoActions };
	}

	private mapPlaybookToActionType(impactType: string): string {
		switch (impactType) {
			case "SECURITY":
				return "REVOKE_ACCESS";
			case "SAVINGS":
				return "ARCHIVE_FILE";
			case "EFFICIENCY":
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
