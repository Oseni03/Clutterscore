/* eslint-disable @typescript-eslint/no-explicit-any */
import { Dropbox } from "dropbox";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
	RestoreFileAction,
	RestorePermissionsAction,
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

	async fetchUserCount(): Promise<number> {
		await this.ensureValidToken();

		try {
			const response = await fetch(
				"https://api.dropboxapi.com/2/team/get_info",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.config.accessToken}`,
						"Content-Type": "application/json",
					},
				}
			);

			if (!response.ok) {
				throw new Error(`Dropbox API error: ${response.statusText}`);
			}

			const data = await response.json();

			// Return the number of licensed users
			return data.num_licensed_users || 0;
		} catch (error: any) {
			const connectorError = await this.handleApiError(error);
			throw new Error(
				`Failed to fetch Dropbox user count: ${connectorError.message}`
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
	 * Archive a file to a dedicated archive folder
	 * Override to support proper undo
	 */
	async archiveFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		try {
			const archiveFolderPath = "/Clutterscore Archive";

			// Ensure archive folder exists
			try {
				await this.client.filesCreateFolderV2({
					path: archiveFolderPath,
					autorename: false,
				});
			} catch (error: any) {
				// Folder already exists - that's fine
				if (error.error?.error?.[".tag"] !== "path") {
					throw error;
				}
			}

			// Get file name from path
			const fileName = externalId.split("/").pop() || "unknown";
			const archivePath = `${archiveFolderPath}/${fileName}`;

			// Move file to archive folder
			const result = await this.client.filesMoveV2({
				from_path: externalId,
				to_path: archivePath,
				autorename: true, // Rename if conflict
			});

			// Store archive info for undo
			metadata.archivePath = result.result.metadata.path_display;
			metadata.originalPath = externalId;
			metadata.archivedAt = new Date().toISOString();

			logger.info(`Archived file ${externalId} to ${archivePath}`);
		} catch (error: any) {
			if (error.error?.error?.[".tag"] === "from_lookup") {
				throw new Error(`File ${externalId} not found`);
			}
			throw new Error(`Failed to archive file: ${error.message}`);
		}
	}

	/**
	 * Update file permissions (restrict access)
	 * Override to capture original permissions for undo
	 */
	async updatePermissions(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		try {
			// Get current sharing info before modifying
			const sharingInfo = await this.getSharedInfo(externalId);

			metadata.originalSharing = {
				isPubliclyShared: sharingInfo.isPublic,
				sharedWith: sharingInfo.sharedWith,
			};

			// Remove public link if exists
			try {
				const links = await this.client.sharingListSharedLinks({
					path: externalId,
				});

				for (const link of links.result.links) {
					if (link[".tag"] === "file") {
						await this.client.sharingRevokeSharedLink({
							url: link.url,
						});
					}
				}

				// Remove all members with access
				const membersResponse =
					await this.client.sharingListFileMembers({
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
			} catch (error: any) {
				logger.warn("Could not revoke shared links:", error.message);
			}

			logger.info(`Updated permissions for file ${externalId}`);
		} catch (error: any) {
			if (error.error?.error?.[".tag"] === "not_found") {
				throw new Error(`File ${externalId} not found`);
			}
			throw new Error(`Failed to update permissions: ${error.message}`);
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

	/**
	 * Restore a file from archive folder back to its original location
	 */
	async restoreFile(undoAction: RestoreFileAction): Promise<void> {
		const { externalId, originalPath, originalMetadata } = undoAction;

		try {
			const archivePath = originalMetadata.archivePath || externalId;

			if (!originalPath) {
				throw new Error(
					"Original file path not found in undo metadata"
				);
			}

			// Move file back from archive to original location
			await this.client.filesMoveV2({
				from_path: archivePath,
				to_path: originalPath,
				autorename: false, // Don't rename if conflict exists
			});

			console.log(`Restored file from ${archivePath} to ${originalPath}`);
		} catch (error: any) {
			if (error.status === 409) {
				// File already exists at destination
				throw new Error(
					`Cannot restore: file already exists at ${originalPath}`
				);
			}
			if (error.error?.error?.[".tag"] === "from_lookup") {
				throw new Error(
					`File not found in archive. It may have been permanently deleted.`
				);
			}
			throw new Error(`Failed to restore file: ${error.message}`);
		}
	}

	/**
	 * Restore file permissions to their original state
	 */
	async restorePermissions(
		undoAction: RestorePermissionsAction
	): Promise<void> {
		const { fileId, originalSharing } = undoAction;

		try {
			// If file was originally publicly shared, recreate public link
			if (originalSharing.isPubliclyShared) {
				await this.client.sharingCreateSharedLinkWithSettings({
					path: fileId,
					settings: {
						requested_visibility: { ".tag": "public" },
					},
				});
			}

			// Restore member permissions
			if (
				originalSharing.sharedWith &&
				originalSharing.sharedWith.length > 0
			) {
				for (const email of originalSharing.sharedWith) {
					try {
						await this.client.sharingAddFileMember({
							file: fileId,
							members: [
								{
									".tag": "email",
									email,
								},
							],
							quiet: true, // Don't send notification
						});
					} catch (error: any) {
						console.warn(
							`Could not restore access for ${email}:`,
							error.message
						);
					}
				}
			}

			console.log(`Restored permissions for file ${fileId}`);
		} catch (error: any) {
			if (error.error?.error?.[".tag"] === "not_found") {
				throw new Error(`File ${fileId} not found`);
			}
			throw new Error(`Failed to restore permissions: ${error.message}`);
		}
	}
}
