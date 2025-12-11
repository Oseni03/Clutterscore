/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebClient } from "@slack/web-api";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
	ChannelData,
} from "./types";
import crypto from "crypto";
import { logger } from "../logger";

export class SlackConnector extends BaseConnector {
	private client: WebClient;

	constructor(config: ConnectorConfig) {
		super(config, "SLACK");
		this.client = new WebClient(config.accessToken);
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
			channels, // ✅ Include channels in audit data
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

					// Create duplicate key using hash OR name-size combination
					const nameSize = `${file.name || "Untitled"}-${sizeMb}`;
					const duplicateKey = hash || nameSize;

					// Track duplicates by hash or name-size
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
						isDuplicate: false, // Will be updated after processing all files
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

		// Mark duplicates after all files are collected
		for (const file of files) {
			const duplicateKey = file.duplicateGroup!;
			const duplicateIds = duplicateMap.get(duplicateKey);

			if (duplicateIds && duplicateIds.length > 1) {
				file.isDuplicate = true;
			} else {
				file.duplicateGroup = undefined; // Clear group if not a duplicate
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
					// Skip bots and deleted users
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

	/**
	 * Fetch all channels with detailed information
	 * Returns both public and private channels
	 */
	async fetchChannels(): Promise<ChannelData[]> {
		const channels: ChannelData[] = [];
		let cursor: string | undefined;

		try {
			do {
				const response: any = await this.client.conversations.list({
					types: "public_channel,private_channel",
					limit: 1000,
					cursor,
					// exclude_archived: false, // Include archived channels for complete audit
				});

				for (const channel of response.channels || []) {
					// Get more detailed info about the channel
					let lastActivity: Date | undefined;

					try {
						// Fetch channel history to get last message time
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
						// If we can't get history, use the channel's updated timestamp
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

	/**
	 * Identify channels that are inactive based on criteria:
	 * - Not archived already
	 * - Last activity older than specified days
	 * - Low member count (optional filter)
	 */
	async identifyInactiveChannels(
		daysInactive: number = 90,
		maxMembers?: number
	): Promise<ChannelData[]> {
		const channels = await this.fetchChannels();
		const cutoffDate = new Date(
			Date.now() - daysInactive * 24 * 60 * 60 * 1000
		);

		return channels.filter((c) => {
			// Must not already be archived
			if (c.isArchived) return false;

			// Must have last activity before cutoff
			if (!c.lastActivity || c.lastActivity >= cutoffDate) return false;

			// Optional: filter by member count
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
	 * Archive a file in Slack by deleting it
	 * Note: Slack doesn't support moving files to folders
	 * Files are permanently deleted, so use with caution
	 */
	async archiveFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get file info first for logging
			const fileInfo: any = await this.client.files.info({
				file: externalId,
			});

			if (!fileInfo.ok) {
				throw new Error(fileInfo.error || "Failed to get file info");
			}

			const file = fileInfo.file;
			const fileName = file.name || file.title || "Unknown";

			// Revoke public URL if it exists (safety measure before deletion)
			if (file.public_url_shared || file.is_public) {
				await this.client.files.revokePublicURL({
					file: externalId,
				});
				logger.info(
					`Revoked public access for Slack file "${fileName}"`
				);
			}

			// Delete the file
			// WARNING: This is permanent in Slack - there's no archive folder
			const deleteResponse: any = await this.client.files.delete({
				file: externalId,
			});

			if (!deleteResponse.ok) {
				throw new Error(
					deleteResponse.error || "Failed to delete file"
				);
			}

			logger.info(
				`Archived (deleted) Slack file "${fileName}" (${externalId}). ` +
					`Size: ${metadata.size || 0} MB, Path: ${metadata.path || "unknown"}`
			);
		} catch (error) {
			throw new Error(
				`Failed to archive Slack file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Revoke public sharing for a file
	 */
	async updatePermissions(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
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

	/**
	 * Archive a Slack channel
	 * Archived channels can be unarchived by workspace admins
	 */
	async archiveChannel(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const response: any = await this.client.conversations.archive({
				channel: externalId,
			});

			if (!response.ok) {
				throw new Error(response.error || "Failed to archive channel");
			}

			const channelName = metadata.name || externalId;
			logger.info(
				`Archived Slack channel "${channelName}" (${externalId}). ` +
					`Members: ${metadata.memberCount || 0}, Last activity: ${metadata.lastActivity || "unknown"}`
			);
		} catch (error) {
			throw new Error(
				`Failed to archive Slack channel ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Unarchive a Slack channel (for undo functionality)
	 */
	async unarchiveChannel(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			const response: any = await this.client.conversations.unarchive({
				channel: externalId,
			});

			if (!response.ok) {
				throw new Error(
					response.error || "Failed to unarchive channel"
				);
			}

			logger.info(`Unarchived Slack channel ${externalId}`);
		} catch (error) {
			throw new Error(
				`Failed to unarchive Slack channel ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Remove a guest user from Slack workspace
	 * Requires admin.users:write scope
	 */
	async removeGuest(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const teamId = this.config.metadata?.teamId;
			if (!teamId) {
				throw new Error("Team ID is required to remove guests");
			}

			const response: any = await this.client.admin.users.remove({
				user_id: externalId,
				team_id: teamId,
			});

			if (!response.ok) {
				throw new Error(response.error || "Failed to remove guest");
			}

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

	/**
	 * Deactivate a user account in Slack
	 * Requires admin.users:write scope
	 */
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
}
