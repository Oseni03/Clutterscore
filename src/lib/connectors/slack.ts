/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebClient } from "@slack/web-api";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
	ChannelData,
	RestoreChannelAction,
	RestoreUserAction,
	RestoreFileAction,
} from "./types";
import crypto from "crypto";
import { logger } from "../logger";
import { ArchiveService } from "@/server/archive-service";

export class SlackConnector extends BaseConnector {
	private client: WebClient;
	// private archiveService: ArchiveService;

	constructor(config: ConnectorConfig) {
		super(config, "SLACK");
		this.client = new WebClient(config.accessToken);
		// this.archiveService = new ArchiveService();
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.ensureValidToken();
			const response = await this.client.auth.test();
			return !!response.ok;
		} catch (error) {
			logger.error("Slack connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available for Slack");
		}

		try {
			const response = await fetch(
				"https://slack.com/api/oauth.v2.access",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						grant_type: "refresh_token",
						refresh_token: this.config.refreshToken,
						client_id: process.env.SLACK_CLIENT_ID!,
						client_secret: process.env.SLACK_CLIENT_SECRET!,
					}),
				}
			);

			const data = await response.json();

			if (!data.ok) {
				throw new Error(data.error || "Token refresh failed");
			}

			// Update client with new token
			this.client = new WebClient(data.access_token);

			return data.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Slack token: ${(error as Error).message}`
			);
		}
	}

	async fetchUserCount(): Promise<number> {
		await this.ensureValidToken();

		try {
			let totalUsers = 0;
			let cursor: string | undefined = undefined;

			do {
				const params = new URLSearchParams({
					limit: "200",
					...(cursor && { cursor }),
				});

				const response = await fetch(
					`https://slack.com/api/users.list?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${this.config.accessToken}`,
						},
					}
				);

				if (!response.ok) {
					throw new Error(`Slack API error: ${response.statusText}`);
				}

				const data = await response.json();

				if (!data.ok) {
					throw new Error(`Slack API error: ${data.error}`);
				}

				// Count non-bot, non-deleted users
				const realUsers = data.members?.filter(
					(member: any) => !member.is_bot && !member.deleted
				);
				totalUsers += realUsers?.length || 0;

				cursor = data.response_metadata?.next_cursor;
			} while (cursor);

			return totalUsers;
		} catch (error: any) {
			const connectorError = await this.handleApiError(error);
			throw new Error(
				`Failed to fetch Slack user count: ${connectorError.message}`
			);
		}
	}

	async fetchAuditData(): Promise<AuditData> {
		await this.ensureValidToken();

		// Fetch all data in parallel for better performance
		const [files, users, channels] = await Promise.all([
			this.fetchFiles(),
			this.fetchUsers(),
			this.fetchChannels(),
		]);

		const totalStorage = files.reduce((sum, f) => sum + f.sizeMb, 0);
		const activeUsers = users.filter(
			(u) =>
				u.lastActive &&
				u.lastActive > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		).length;

		return {
			files,
			users,
			channels,
			storageUsedGb: this.mbToGb(totalStorage),
			totalLicenses: users.length,
			activeUsers,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		let page = 1;
		const duplicateMap = new Map<string, string[]>();

		try {
			while (true) {
				const response: any = await this.client.files.list({
					count: 1000,
					page,
				});

				for (const file of response.files || []) {
					const sizeMb = this.bytesToMb(file.size || 0);
					const hash = this.generateFileHash(
						file.name || "Untitled",
						sizeMb
					);

					const nameSize = `${file.name || "Untitled"}-${sizeMb}`;
					const duplicateKey = hash || nameSize;

					if (!duplicateMap.has(duplicateKey)) {
						duplicateMap.set(duplicateKey, []);
					}
					duplicateMap.get(duplicateKey)!.push(file.id);

					files.push({
						name: file.name || file.title || "Untitled",
						sizeMb,
						type: this.inferFileType(file.mimetype || ""),
						source: "SLACK",
						externalId: file.id,
						mimeType: file.mimetype || undefined,
						fileHash: hash,
						url: file.url_private || file.permalink,
						path: `/${file.channels?.[0] || "direct-messages"}/${file.name || file.title}`,
						lastAccessed: file.timestamp
							? new Date(parseInt(file.timestamp) * 1000)
							: undefined,
						ownerEmail: file.user || undefined,
						isPubliclyShared:
							file.is_public || file.public_url_shared || false,
						sharedWith: file.channels || [],
						isDuplicate: false,
						duplicateGroup: duplicateKey,
					});
				}

				const current = response.paging?.page ?? page;
				const total = response.paging?.pages ?? current;

				if (current >= total) break;
				page = current + 1;
			}
		} catch (error) {
			logger.error("Error fetching Slack files:", error);
		}

		// Mark duplicates
		for (const file of files) {
			const duplicateKey = file.duplicateGroup!;
			const duplicateIds = duplicateMap.get(duplicateKey);

			if (duplicateIds && duplicateIds.length > 1) {
				file.isDuplicate = true;
			} else {
				file.duplicateGroup = undefined;
			}
		}

		return files;
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let cursor: string | undefined;

		try {
			do {
				const response: any = await this.client.users.list({
					limit: 1000,
					cursor,
				});

				for (const user of response.members || []) {
					if (user.is_bot || user.deleted) continue;

					users.push({
						email: user.profile?.email || "",
						name: user.real_name || user.name || "Unknown User",
						role: user.is_owner
							? "owner"
							: user.is_admin
								? "admin"
								: user.is_primary_owner
									? "owner"
									: "user",
						lastActive: user.updated
							? new Date(user.updated * 1000)
							: undefined,
						isGuest:
							user.is_restricted ||
							user.is_ultra_restricted ||
							user.is_stranger ||
							false,
						licenseType: this.mapLicenseType(user),
					});
				}

				cursor = response.response_metadata?.next_cursor;
			} while (cursor);
		} catch (error) {
			logger.error("Error fetching Slack users:", error);
		}

		return users;
	}

	private mapLicenseType(user: any): string {
		if (user.is_ultra_restricted) return "guest";
		if (user.is_restricted) return "multi-channel-guest";
		return "full";
	}

	private generateFileHash(name: string, size: number): string {
		return crypto
			.createHash("sha256")
			.update(`${name}-${size}`)
			.digest("hex");
	}

	// ============================================================================
	// CHANNEL MANAGEMENT
	// ============================================================================

	async fetchChannels(): Promise<ChannelData[]> {
		const channels: ChannelData[] = [];
		let cursor: string | undefined;

		try {
			do {
				const response: any = await this.client.conversations.list({
					types: "public_channel,private_channel",
					limit: 1000,
					cursor,
				});

				for (const channel of response.channels || []) {
					let lastActivity: Date | undefined;

					try {
						const history = await this.client.conversations.history(
							{
								channel: channel.id,
								limit: 1,
							}
						);

						if (history.messages && history.messages.length > 0) {
							const lastMessage = history.messages[0];
							lastActivity = new Date(
								parseFloat(lastMessage.ts!) * 1000
							);
						}
					} catch (historyError) {
						logger.warn(
							`Could not fetch history for channel ${channel.name}: ${historyError}`
						);
						lastActivity = channel.updated
							? new Date(channel.updated * 1000)
							: undefined;
					}

					channels.push({
						id: channel.id,
						name: channel.name,
						memberCount: channel.num_members || 0,
						lastActivity:
							lastActivity ||
							(channel.updated
								? new Date(channel.updated * 1000)
								: undefined),
						isArchived: channel.is_archived || false,
						isPrivate: channel.is_private || false,
					});
				}

				cursor = response.response_metadata?.next_cursor;
			} while (cursor);

			logger.info(`Fetched ${channels.length} Slack channels`);
		} catch (error) {
			logger.error("Error fetching Slack channels:", error);
		}

		return channels;
	}

	async identifyInactiveChannels(
		daysInactive: number = 90,
		maxMembers?: number
	): Promise<ChannelData[]> {
		const channels = await this.fetchChannels();
		const cutoffDate = new Date(
			Date.now() - daysInactive * 24 * 60 * 60 * 1000
		);

		return channels.filter((c) => {
			if (c.isArchived) return false;
			if (!c.lastActivity || c.lastActivity >= cutoffDate) return false;
			if (maxMembers !== undefined && c.memberCount > maxMembers)
				return false;
			return true;
		});
	}

	// ============================================================================
	// ANALYSIS METHODS
	// ============================================================================

	async identifyDuplicateFiles(): Promise<FileData[]> {
		const files = await this.fetchFiles();
		return files.filter((f) => f.isDuplicate);
	}

	async identifyPublicFiles(): Promise<FileData[]> {
		const files = await this.fetchFiles();
		return files.filter((f) => f.isPubliclyShared);
	}

	async identifyOldFiles(daysOld: number = 365): Promise<FileData[]> {
		const files = await this.fetchFiles();
		const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

		return files.filter(
			(f) => f.lastAccessed && f.lastAccessed < cutoffDate
		);
	}

	async identifyGuestUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.isGuest);
	}

	async identifyInactiveUsers(
		daysInactive: number = 90
	): Promise<UserData[]> {
		const users = await this.fetchUsers();
		const cutoffDate = new Date(
			Date.now() - daysInactive * 24 * 60 * 60 * 1000
		);

		return users.filter((u) => u.lastActive && u.lastActive < cutoffDate);
	}

	// ============================================================================
	// EXECUTION METHODS
	// ============================================================================

	/**
	 * Archive a file by downloading to Vercel Blob, then deleting from Slack
	 * This provides full restore capability despite Slack's permanent deletion
	 */
	// async archiveFile(
	// 	externalId: string,
	// 	metadata: Record<string, any>
	// ): Promise<void> {
	// 	await this.ensureValidToken();

	// 	try {
	// 		// 1. Get file info from Slack
	// 		const fileInfo: any = await this.client.files.info({
	// 			file: externalId,
	// 		});

	// 		if (!fileInfo.ok) {
	// 			throw new Error(fileInfo.error || "Failed to get file info");
	// 		}

	// 		const file = fileInfo.file;
	// 		const fileName = file.name || file.title || "Unknown";
	// 		const fileUrl = file.url_private;

	// 		if (!fileUrl) {
	// 			throw new Error("File download URL not available");
	// 		}

	// 		// 2. Store original state for metadata
	// 		metadata.originalState = {
	// 			name: fileName,
	// 			url: fileUrl,
	// 			isPublic: file.public_url_shared || file.is_public,
	// 			channels: file.channels || [],
	// 			timestamp: file.timestamp,
	// 			user: file.user,
	// 		};

	// 		// 3. Archive to Vercel Blob
	// 		const archiveId = await this.archiveService.archiveFile({
	// 			organizationId: this.config.organizationId,
	// 			source: "SLACK",
	// 			externalId,
	// 			fileName,
	// 			fileUrl,
	// 			sizeMb: this.bytesToMb(file.size || 0),
	// 			mimeType: file.mimetype,
	// 			metadata: {
	// 				...metadata,
	// 				originalState: metadata.originalState,
	// 				headers: {
	// 					Authorization: `Bearer ${this.config.accessToken}`,
	// 				},
	// 			},
	// 			archivedBy: metadata.archivedBy,
	// 		});

	// 		// 4. Store archive ID for undo
	// 		metadata.archiveId = archiveId;
	// 		metadata.canRestore = true;
	// 		metadata.archivedAt = new Date().toISOString();

	// 		// 5. Revoke public URL if exists (safety measure)
	// 		if (file.public_url_shared || file.is_public) {
	// 			await this.client.files.revokePublicURL({ file: externalId });
	// 			logger.info(`Revoked public access for file "${fileName}"`);
	// 		}

	// 		// 6. Delete from Slack (now safe because we have a backup)
	// 		const deleteResponse: any = await this.client.files.delete({
	// 			file: externalId,
	// 		});

	// 		if (!deleteResponse.ok) {
	// 			// If deletion fails, we should clean up the archive
	// 			logger.error(
	// 				`Failed to delete file from Slack, but archive exists: ${archiveId}`
	// 			);
	// 			throw new Error(
	// 				deleteResponse.error || "Failed to delete file from Slack"
	// 			);
	// 		}

	// 		logger.info(
	// 			`Archived Slack file "${fileName}" (${externalId}) to Vercel Blob (${archiveId})`
	// 		);
	// 	} catch (error) {
	// 		throw new Error(
	// 			`Failed to archive Slack file ${externalId}: ${(error as Error).message}`
	// 		);
	// 	}
	// }

	/**
	 * Check if a file can be restored
	 */
	// async canRestoreFile(archiveId: string): Promise<boolean> {
	// 	return this.archiveService.fileExists(archiveId);
	// }

	async updatePermissions(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get file info to capture original state
			const fileInfo: any = await this.client.files.info({
				file: externalId,
			});

			if (fileInfo.ok && fileInfo.file) {
				metadata.originalSharing = {
					isPubliclyShared:
						fileInfo.file.public_url_shared ||
						fileInfo.file.is_public,
					sharedWith: fileInfo.file.channels || [],
				};
			}

			// Revoke public access
			const response: any = await this.client.files.revokePublicURL({
				file: externalId,
			});

			if (!response.ok) {
				throw new Error(
					response.error || "Failed to revoke public access"
				);
			}

			logger.info(`Revoked public access for Slack file ${externalId}`);
		} catch (error) {
			throw new Error(
				`Failed to update permissions for Slack file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	async archiveChannel(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get channel info before archiving
			const infoResponse: any = await this.client.conversations.info({
				channel: externalId,
			});

			if (infoResponse.ok && infoResponse.channel) {
				const channel = infoResponse.channel;
				metadata.originalState = {
					isArchived: channel.is_archived,
					memberCount: channel.num_members,
					name: channel.name,
					isPrivate: channel.is_private,
				};
			}

			// Archive the channel
			const response: any = await this.client.conversations.archive({
				channel: externalId,
			});

			if (!response.ok) {
				if (response.error === "already_archived") {
					logger.warn(`Channel ${externalId} is already archived`);
					return;
				}
				throw new Error(response.error || "Failed to archive channel");
			}

			metadata.archivedAt = new Date().toISOString();
			const channelName = metadata.name || externalId;
			logger.info(
				`Archived Slack channel "${channelName}" (${externalId})`
			);
		} catch (error) {
			throw new Error(
				`Failed to archive Slack channel ${externalId}: ${(error as Error).message}`
			);
		}
	}

	async removeGuest(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get user info before removing
			const userResponse: any = await this.client.users.info({
				user: externalId,
			});

			if (userResponse.ok && userResponse.user) {
				const user = userResponse.user;
				metadata.originalAccess = {
					isGuest:
						user.is_restricted ||
						user.is_ultra_restricted ||
						user.is_stranger,
					role: user.is_ultra_restricted
						? "single_channel_guest"
						: user.is_restricted
							? "guest"
							: "member",
					email: user.profile?.email,
					name: user.real_name || user.name,
					licenseType: this.mapLicenseType(user),
				};
			}

			const teamId = this.config.metadata?.teamId;
			if (!teamId) {
				throw new Error("Team ID is required to remove guests");
			}

			// Remove user from workspace
			const response: any = await this.client.admin.users.remove({
				user_id: externalId,
				team_id: teamId,
			});

			if (!response.ok) {
				if (response.error === "cant_remove_primary_owner") {
					throw new Error("Cannot remove primary workspace owner");
				}
				throw new Error(response.error || "Failed to remove guest");
			}

			metadata.removedAt = new Date().toISOString();
			const userName = metadata.name || metadata.email || externalId;
			logger.info(
				`Removed guest user "${userName}" (${externalId}) from Slack workspace`
			);
		} catch (error) {
			throw new Error(
				`Failed to remove Slack guest ${externalId}: ${(error as Error).message}`
			);
		}
	}

	async disableUser(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const teamId = this.config.metadata?.teamId;
			if (!teamId) {
				throw new Error("Team ID is required to disable users");
			}

			const response: any = await this.client.admin.users.setExpiration({
				team_id: teamId,
				user_id: externalId,
				expiration_ts: 0,
			});

			if (!response.ok) {
				throw new Error(response.error || "Failed to deactivate user");
			}

			const userName = metadata.name || metadata.email || externalId;
			logger.info(
				`Deactivated user "${userName}" (${externalId}) in Slack workspace`
			);
		} catch (error) {
			throw new Error(
				`Failed to deactivate Slack user ${externalId}: ${(error as Error).message}`
			);
		}
	}

	// ============================================================================
	// UNDO METHODS - Restore previously executed actions
	// ============================================================================

	/**
	 * Restore (unarchive) a Slack channel
	 */
	async restoreChannel(undoAction: RestoreChannelAction): Promise<void> {
		await this.ensureValidToken();

		const { channelId, channelName } = undoAction;

		try {
			const response: any = await this.client.conversations.unarchive({
				channel: channelId,
			});

			if (!response.ok) {
				if (response.error === "not_archived") {
					logger.warn(`Channel ${channelName} is not archived`);
					return;
				}
				if (response.error === "channel_not_found") {
					throw new Error(
						`Channel ${channelName} not found. It may have been deleted.`
					);
				}
				throw new Error(`Slack API error: ${response.error}`);
			}

			logger.info(
				`Restored (unarchived) channel ${channelId} (${channelName})`
			);
		} catch (error) {
			throw new Error(
				`Failed to restore channel: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Restore a guest user's access by re-inviting them
	 */
	async restoreUser(undoAction: RestoreUserAction): Promise<void> {
		await this.ensureValidToken();

		const { userEmail, role, originalMetadata } = undoAction;

		try {
			const teamId = this.config.metadata?.teamId;
			if (!teamId) {
				throw new Error("Team ID is required to restore users");
			}

			// Determine invite parameters based on original role
			const isUltraRestricted = role === "single_channel_guest";
			const isRestricted =
				role === "guest" || role === "multi-channel-guest";

			// Re-invite the user
			const response: any = await this.client.admin.users.invite({
				email: userEmail,
				team_id: teamId,
				channel_ids: originalMetadata?.defaultChannels || [],
				is_restricted: isRestricted && !isUltraRestricted,
				is_ultra_restricted: isUltraRestricted,
			});

			if (!response.ok) {
				if (response.error === "already_in_team") {
					logger.info(
						`User ${userEmail} is already in the workspace`
					);
					return;
				}
				if (response.error === "already_invited") {
					logger.info(
						`User ${userEmail} already has a pending invite`
					);
					return;
				}
				throw new Error(`Slack API error: ${response.error}`);
			}

			logger.info(`Restored user ${userEmail} with role ${role}`);
		} catch (error) {
			throw new Error(
				`Failed to restore user: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Restore a file from Vercel Blob back to Slack
	 * The file will be uploaded as a new file with a new ID
	 */
	// async restoreFile(undoAction: RestoreFileAction): Promise<void> {
	// 	await this.ensureValidToken();

	// 	const { originalMetadata } = undoAction;
	// 	const archiveId = originalMetadata.archiveId;

	// 	if (!archiveId) {
	// 		throw new Error(
	// 			"Archive ID not found. Cannot restore file without backup."
	// 		);
	// 	}

	// 	try {
	// 		// Restore from Vercel Blob back to Slack
	// 		const uploadResult = await this.archiveService.restoreFile(
	// 			{ archiveId },
	// 			async (buffer, metadata) => {
	// 				// Upload callback: upload buffer back to Slack
	// 				const channels =
	// 					metadata.originalLocation?.channels ||
	// 					originalMetadata.originalState?.channels ||
	// 					[];

	// 				const channelId = channels[0] || metadata.targetLocation;

	// 				if (!channelId) {
	// 					throw new Error(
	// 						"No channel specified for file restoration. Original channel information may be lost."
	// 					);
	// 				}

	// 				// Upload to Slack
	// 				const uploadResponse = await this.client.files.uploadV2({
	// 					channel_id: channelId,
	// 					file: buffer,
	// 					filename: metadata.fileName,
	// 					title: metadata.fileName,
	// 					initial_comment: `📦 Restored from archive (original file was archived on ${new Date(originalMetadata.archivedAt).toLocaleDateString()})`,
	// 				});

	// 				if (!uploadResponse.ok) {
	// 					throw new Error(
	// 						`Slack upload failed: ${uploadResponse.error || "Unknown error"}`
	// 					);
	// 				}

	// 				return {
	// 					messages: uploadResponse.response_metadata?.messages,
	// 					channelId,
	// 				};
	// 			}
	// 		);

	// 		logger.info(
	// 			`Restored file from archive ${archiveId}, new Slack file: ${uploadResult}`
	// 		);
	// 	} catch (error) {
	// 		throw new Error(
	// 			`Failed to restore file: ${(error as Error).message}`
	// 		);
	// 	}
	// }

	/**
	 * Restore file permissions (make file public again)
	 */
	async restorePermissions(): Promise<void> {
		throw new Error(
			"Slack permission restoration is not supported. Once public access is revoked, " +
				"files must be manually shared again by the file owner."
		);
	}
}
