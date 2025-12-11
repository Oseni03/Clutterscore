/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dropbox } from "dropbox";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";
import { ToolSource } from "@prisma/client";
import { logger } from "../logger";

export class DropboxConnector extends BaseConnector {
	private client: Dropbox;

	constructor(config: ConnectorConfig) {
		super(config, "DROPBOX");
		this.client = new Dropbox({
			accessToken: config.accessToken,
			clientId: process.env.DROPBOX_CLIENT_ID,
			clientSecret: process.env.DROPBOX_CLIENT_SECRET,
		});
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.ensureValidToken();
			await this.client.usersGetCurrentAccount();
			return true;
		} catch (error) {
			logger.error("Dropbox connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available for Dropbox");
		}

		try {
			const response = await fetch(
				"https://api.dropbox.com/oauth2/token",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						grant_type: "refresh_token",
						refresh_token: this.config.refreshToken,
						client_id: process.env.DROPBOX_CLIENT_ID!,
						client_secret: process.env.DROPBOX_CLIENT_SECRET!,
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`Token refresh failed: ${response.statusText}`);
			}

			const data = await response.json();

			// Update the client with new token
			this.client = new Dropbox({
				accessToken: data.access_token,
				clientId: process.env.DROPBOX_CLIENT_ID,
				clientSecret: process.env.DROPBOX_CLIENT_SECRET,
			});

			return data.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Dropbox token: ${(error as Error).message}`
			);
		}
	}

	async fetchAuditData(): Promise<AuditData> {
		await this.ensureValidToken();

		const [files, users] = await Promise.all([
			this.fetchFiles(),
			this.fetchUsers(),
		]);

		const totalStorage = files.reduce((sum, f) => sum + f.sizeMb, 0);

		return {
			files,
			users,
			storageUsedGb: this.mbToGb(totalStorage),
			totalLicenses: users.length,
			activeUsers: users.filter((u) => u.licenseType === "active").length,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		// Map to track duplicates by name + size combination
		const duplicateMap = new Map<string, string[]>();

		const listFiles = async (path: string = "") => {
			let cursor: string | undefined;

			do {
				try {
					const response = cursor
						? await this.client.filesListFolderContinue({ cursor })
						: await this.client.filesListFolder({
								path,
								recursive: true,
								include_deleted: false,
								include_mounted_folders: true,
							});

					for (const entry of response.result.entries) {
						if (entry[".tag"] !== "file") continue;

						const sizeMb = this.bytesToMb(entry.size || 0);

						// Create duplicate key from name + size (rounded to 2 decimals for consistency)
						const duplicateKey = `${entry.name.toLowerCase()}_${sizeMb.toFixed(2)}`;

						// Track duplicates by name + size
						if (!duplicateMap.has(duplicateKey)) {
							duplicateMap.set(duplicateKey, []);
						}
						duplicateMap.get(duplicateKey)!.push(entry.id);

						const sharedInfo = await this.getSharedInfo(entry.id);

						files.push({
							name: entry.name,
							sizeMb,
							type: this.inferFileType(entry.name), // Infer from file extension
							source: "DROPBOX" as ToolSource,
							externalId: entry.id, // CRITICAL: Store Dropbox file ID
							mimeType: "application/octet-stream", // Dropbox doesn't provide MIME type easily
							fileHash: entry.content_hash || undefined, // Optional content hash
							url: undefined, // Can be populated later if needed
							path: entry.path_display || `/${entry.name}`,
							lastAccessed: entry.client_modified
								? new Date(entry.client_modified)
								: entry.server_modified
									? new Date(entry.server_modified)
									: new Date(), // Fallback to current date to satisfy non-nullable requirement
							ownerEmail: undefined, // Dropbox doesn't expose owner email easily
							isPubliclyShared: sharedInfo.isPublic,
							sharedWith: sharedInfo.sharedWith,
							isDuplicate: false, // Will be updated in second pass
							duplicateGroup: duplicateKey, // Store temporarily for processing
						});
					}

					cursor = response.result.has_more
						? response.result.cursor
						: undefined;
				} catch (error) {
					logger.error("Error listing Dropbox files:", error);
					throw error;
				}
			} while (cursor);
		};

		await listFiles("");

		// Second pass: Mark duplicates after all files are collected
		for (const file of files) {
			const duplicateKey = file.duplicateGroup!;
			const duplicateIds = duplicateMap.get(duplicateKey);

			if (duplicateIds && duplicateIds.length > 1) {
				file.isDuplicate = true;
				// Keep duplicateGroup for grouping in UI
			} else {
				// Clear group if not a duplicate
				file.isDuplicate = false;
				file.duplicateGroup = undefined;
			}
		}

		return files;
	}

	private async getSharedInfo(fileId: string): Promise<{
		isPublic: boolean;
		sharedWith: string[];
	}> {
		try {
			// Check for shared links
			const linksResponse = await this.client.sharingListSharedLinks({
				path: fileId,
				direct_only: true,
			});

			const isPublic = (linksResponse.result.links || []).some(
				(link) => link[".tag"] === "file" && link.url
			);

			// Check for shared members
			const membersResponse = await this.client.sharingListFileMembers({
				file: fileId,
			});

			const sharedWith = (membersResponse.result.users || [])
				.map((m) => m.user?.email)
				.filter((email): email is string => Boolean(email));

			return { isPublic, sharedWith };
		} catch {
			// File might not be shared or we don't have permission
			return { isPublic: false, sharedWith: [] };
		}
	}

	private async fetchUsers(): Promise<UserData[]> {
		try {
			// Try to fetch team members (Business accounts)
			const response = await this.client.teamMembersListV2({});
			const members = response.result.members || [];

			return members.map((member: any) => ({
				email: member.profile.email,
				name: member.profile.name.display_name,
				role: member.role?.[".tag"] === "team_admin" ? "admin" : "user",
				lastActive: undefined, // Dropbox doesn't provide last active
				isGuest: false,
				licenseType:
					member.profile.status?.[".tag"] === "active"
						? "active"
						: "inactive",
			}));
		} catch {
			// Personal account - return current user only
			try {
				const account = await this.client.usersGetCurrentAccount();
				return [
					{
						email: account.result.email,
						name: account.result.name.display_name,
						role: "owner",
						lastActive: undefined,
						isGuest: false,
						licenseType: "active",
					},
				];
			} catch (innerError) {
				logger.error("Error fetching Dropbox user:", innerError);
				return [];
			}
		}
	}

	private generateFileHash(name: string, size: number): string {
		return crypto
			.createHash("sha256")
			.update(`${name}-${size}`)
			.digest("hex");
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

	// ============================================================================
	// EXECUTION METHODS
	// ============================================================================

	/**
	 * Archive a file in Dropbox by moving it to an "Archived" folder
	 * This is safer than permanent deletion and allows for recovery
	 */
	async archiveFile(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			// Get the file info to construct the archive path
			const fileInfo = await this.client.filesGetMetadata({
				path: externalId,
			});

			if (fileInfo.result[".tag"] !== "file") {
				throw new Error("Resource is not a file");
			}

			const file = fileInfo.result;
			const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
			const archivePath = `/Archived/${timestamp}/${file.name}`;

			// Move file to archive folder instead of deleting
			await this.client.filesMoveV2({
				from_path: externalId,
				to_path: archivePath,
				autorename: true, // Automatically rename if conflict exists
			});

			logger.info(`Archived Dropbox file ${file.name} to ${archivePath}`);
		} catch (error) {
			throw new Error(
				`Failed to archive Dropbox file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Revoke shared access to a file (remove all shared links and members)
	 */
	async updatePermissions(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			// Get and revoke all shared links
			const linksResponse = await this.client.sharingListSharedLinks({
				path: externalId,
			});

			for (const link of linksResponse.result.links || []) {
				await this.client.sharingRevokeSharedLink({
					url: link.url,
				});
			}

			// Remove all members with access
			const membersResponse = await this.client.sharingListFileMembers({
				file: externalId,
			});

			for (const user of membersResponse.result.users || []) {
				if (user.user?.account_id) {
					await this.client.sharingRemoveFileMember2({
						file: externalId,
						member: {
							".tag": "dropbox_id",
							dropbox_id: user.user.account_id,
						},
					});
				}
			}
		} catch (error) {
			throw new Error(
				`Failed to update permissions for Dropbox file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Remove a team member from Dropbox Business
	 */
	async removeGuest(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			await this.client.teamMembersRemove({
				user: {
					".tag": "team_member_id",
					team_member_id: externalId,
				},
				wipe_data: false, // Keep their files
				transfer_dest_id: undefined,
				transfer_admin_id: undefined,
				keep_account: false,
			});
		} catch (error) {
			throw new Error(
				`Failed to remove Dropbox team member ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Suspend a team member in Dropbox Business
	 */
	async disableUser(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			await this.client.teamMembersSuspend({
				user: {
					".tag": "team_member_id",
					team_member_id: externalId,
				},
				wipe_data: false,
			});
		} catch (error) {
			throw new Error(
				`Failed to suspend Dropbox team member ${externalId}: ${(error as Error).message}`
			);
		}
	}
}
