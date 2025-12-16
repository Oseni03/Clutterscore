/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@microsoft/microsoft-graph-client";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
	RestoreFileAction,
} from "./types";
import crypto from "crypto";
import { logger } from "../logger";

export class MicrosoftConnector extends BaseConnector {
	private client: Client;

	constructor(config: ConnectorConfig) {
		super(config, "MICROSOFT");

		this.client = Client.init({
			authProvider: (done) => {
				done(null, config.accessToken);
			},
		});
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.client.api("/me").get();
			return true;
		} catch (error) {
			logger.error("Microsoft connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available for Microsoft");
		}

		try {
			const response = await fetch(
				"https://login.microsoftonline.com/common/oauth2/v2.0/token",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						grant_type: "refresh_token",
						refresh_token: this.config.refreshToken,
						client_id: process.env.MICROSOFT_CLIENT_ID!,
						client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
						scope: "https://graph.microsoft.com/.default",
					}),
				}
			);

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Token refresh failed: ${error}`);
			}

			const data = await response.json();

			// Update the client with new token
			this.client = Client.init({
				authProvider: (done) => {
					done(null, data.access_token);
				},
			});

			return data.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Microsoft token: ${(error as Error).message}`
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
		const activeUsers = users.filter(
			(u) =>
				u.lastActive &&
				u.lastActive > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		).length;

		return {
			files,
			users,
			storageUsedGb: this.mbToGb(totalStorage),
			totalLicenses: users.length,
			activeUsers,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		const duplicateMap = new Map<string, string[]>();

		// Fetch from OneDrive and SharePoint
		const drives = await this.getAllDrives();

		for (const drive of drives) {
			await this.fetchFilesFromDrive(drive, files, duplicateMap);
		}

		// Mark duplicates after all files are collected
		for (const file of files) {
			const duplicateKey = file.duplicateGroup!;
			const duplicateIds = duplicateMap.get(duplicateKey);

			if (duplicateIds && duplicateIds.length > 1) {
				file.isDuplicate = true;
			} else {
				file.duplicateGroup = undefined;
			}
		}

		logger.info(
			`Fetched ${files.length} files from Microsoft OneDrive/SharePoint`
		);
		return files;
	}

	private async fetchFilesFromDrive(
		drive: any,
		files: FileData[],
		duplicateMap: Map<string, string[]>
	): Promise<void> {
		try {
			let nextLink: string | undefined =
				`/drives/${drive.id}/root/children`;

			while (nextLink) {
				const response = await this.client
					.api(nextLink)
					.top(999)
					.select(
						"id,name,size,file,webUrl,lastModifiedDateTime,createdDateTime,createdBy,shared,permissions,parentReference"
					)
					.get();

				for (const item of response.value || []) {
					if (!item.file) continue; // Skip folders

					const sizeMb = item.size ? this.bytesToMb(item.size) : 0;
					const hash =
						item.file?.hashes?.sha256Hash ||
						this.generateFileHash(item.name, sizeMb);

					// Create duplicate key using hash OR name-size combination
					const nameSize = `${item.name}-${sizeMb}`;
					const duplicateKey = hash || nameSize;

					// Track duplicates by hash or name-size
					if (!duplicateMap.has(duplicateKey)) {
						duplicateMap.set(duplicateKey, []);
					}
					duplicateMap.get(duplicateKey)!.push(item.id);

					const sharedWith = await this.getSharedWith(
						drive.id,
						item.id
					);

					files.push({
						name: item.name,
						sizeMb,
						type: this.inferFileType(item.file.mimeType || ""),
						source: "MICROSOFT",
						externalId: item.id,
						mimeType: item.file.mimeType,
						fileHash: hash,
						url: item.webUrl,
						path: item.parentReference?.path || `/${item.name}`,
						lastAccessed: item.lastModifiedDateTime
							? new Date(item.lastModifiedDateTime)
							: item.createdDateTime
								? new Date(item.createdDateTime)
								: new Date(),
						ownerEmail: item.createdBy?.user?.email,
						isPubliclyShared:
							item.shared?.scope === "anonymous" ||
							item.shared?.scope === "organization",
						sharedWith,
						isDuplicate: false,
						duplicateGroup: duplicateKey,
					});
				}

				nextLink = response["@odata.nextLink"];
			}
		} catch (error) {
			logger.error(`Error fetching files from drive ${drive.id}:`, error);
		}
	}

	private async getAllDrives(): Promise<any[]> {
		const drives: any[] = [];

		try {
			// Get user's OneDrive
			const myDrive = await this.client.api("/me/drive").get();
			drives.push(myDrive);
			logger.info(`Found OneDrive: ${myDrive.id}`);
		} catch (error) {
			logger.error("Error fetching OneDrive:", error);
		}

		// Get SharePoint sites drives
		try {
			const sites = await this.client
				.api("/sites")
				.filter("siteCollection/root ne null")
				.get();

			logger.info(`Found ${sites.value?.length || 0} SharePoint sites`);

			for (const site of sites.value || []) {
				try {
					const siteDrives = await this.client
						.api(`/sites/${site.id}/drives`)
						.get();

					drives.push(...(siteDrives.value || []));
					logger.info(
						`Found ${siteDrives.value?.length || 0} drives in site ${site.id}`
					);
				} catch (error) {
					logger.warn(
						`Could not access drives for site ${site.id}: ${error}`
					);
				}
			}
		} catch (error) {
			logger.warn(`Could not access SharePoint sites: ${error}`);
		}

		return drives;
	}

	private async getSharedWith(
		driveId: string,
		itemId: string
	): Promise<string[]> {
		try {
			const permissions = await this.client
				.api(`/drives/${driveId}/items/${itemId}/permissions`)
				.get();

			const emails: string[] = [];

			for (const perm of permissions.value || []) {
				if (perm.grantedToIdentitiesV2) {
					perm.grantedToIdentitiesV2.forEach((identity: any) => {
						if (identity.user?.email) {
							emails.push(identity.user.email);
						}
					});
				}
				if (perm.grantedTo?.user?.email) {
					emails.push(perm.grantedTo.user.email);
				}
			}

			return [...new Set(emails)];
		} catch {
			return [];
		}
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let nextLink: string | undefined = "/users";

		try {
			while (nextLink) {
				const response = await this.client
					.api(nextLink)
					.top(999)
					.select(
						"id,displayName,mail,userPrincipalName,accountEnabled,signInActivity,assignedLicenses,userType"
					)
					.get();

				for (const user of response.value || []) {
					users.push({
						email: user.mail || user.userPrincipalName,
						name: user.displayName,
						role: "user",
						lastActive: user.signInActivity?.lastSignInDateTime
							? new Date(user.signInActivity.lastSignInDateTime)
							: undefined,
						isGuest: user.userType === "Guest",
						licenseType:
							user.assignedLicenses?.length > 0
								? "licensed"
								: "unlicensed",
					});
				}

				nextLink = response["@odata.nextLink"];
			}

			logger.info(`Fetched ${users.length} Microsoft users`);
		} catch (error) {
			logger.error("Error fetching Microsoft users:", error);
		}

		return users;
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

	async identifyInactiveUsers(
		daysInactive: number = 90
	): Promise<UserData[]> {
		const users = await this.fetchUsers();
		const cutoffDate = new Date(
			Date.now() - daysInactive * 24 * 60 * 60 * 1000
		);

		return users.filter((u) => u.lastActive && u.lastActive < cutoffDate);
	}

	async identifyGuestUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.isGuest);
	}

	// ============================================================================
	// EXECUTION METHODS
	// ============================================================================

	/**
	 * Archive a file in OneDrive/SharePoint by moving it to Recycle Bin
	 * This is safer than permanent deletion and allows for recovery within 93 days
	 */
	async archiveFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const driveId = metadata?.driveId;
			if (!driveId) {
				throw new Error("driveId required in metadata for archiving");
			}

			// Get file info first for logging
			const fileInfo = await this.client
				.api(`/drives/${driveId}/items/${externalId}`)
				.select("name,size")
				.get();

			const fileName = fileInfo.name || "Unknown";
			const fileSizeMb = fileInfo.size
				? this.bytesToMb(fileInfo.size)
				: 0;

			// Delete moves the file to Recycle Bin (soft delete)
			// Files can be restored from Recycle Bin for 93 days
			await this.client
				.api(`/drives/${driveId}/items/${externalId}`)
				.delete();

			logger.info(
				`Archived Microsoft file "${fileName}" (${externalId}) to Recycle Bin. ` +
					`Size: ${fileSizeMb} MB, Recoverable for 93 days`
			);
		} catch (error: any) {
			throw new Error(
				`Failed to archive Microsoft file ${externalId}: ${error.message}`
			);
		}
	}

	/**
	 * Update file permissions to restrict sharing
	 */
	async updatePermissions(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const driveId = metadata?.driveId;
			if (!driveId) {
				throw new Error("driveId required in metadata for permissions");
			}

			// Get current permissions
			const permissions = await this.client
				.api(`/drives/${driveId}/items/${externalId}/permissions`)
				.get();

			let removedCount = 0;

			// Remove all sharing permissions (keep owner)
			for (const perm of permissions.value || []) {
				if (perm.roles?.includes("owner")) continue; // Keep owner

				await this.client
					.api(
						`/drives/${driveId}/items/${externalId}/permissions/${perm.id}`
					)
					.delete();

				removedCount++;
			}

			logger.info(
				`Revoked ${removedCount} sharing permissions for Microsoft file ${externalId}`
			);
		} catch (error: any) {
			throw new Error(
				`Failed to update permissions for Microsoft file ${externalId}: ${error.message}`
			);
		}
	}

	/**
	 * Remove a guest user from Azure AD
	 */
	async removeGuest(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			// Get user info for logging
			const userInfo = await this.client
				.api(`/users/${externalId}`)
				.select("displayName,mail,userPrincipalName")
				.get();

			const userName =
				userInfo.displayName || userInfo.mail || externalId;

			// Delete user from Azure AD
			await this.client.api(`/users/${externalId}`).delete();

			logger.info(
				`Removed guest user "${userName}" (${externalId}) from Azure AD`
			);
		} catch (error: any) {
			throw new Error(
				`Failed to remove guest user ${externalId}: ${error.message}`
			);
		}
	}

	/**
	 * Disable a user account in Azure AD
	 */
	async disableUser(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			// Get user info for logging
			const userInfo = await this.client
				.api(`/users/${externalId}`)
				.select("displayName,mail,userPrincipalName")
				.get();

			const userName =
				userInfo.displayName || userInfo.mail || externalId;

			// Disable user account
			await this.client.api(`/users/${externalId}`).patch({
				accountEnabled: false,
			});

			logger.info(
				`Disabled user account "${userName}" (${externalId}) in Azure AD`
			);
		} catch (error: any) {
			throw new Error(
				`Failed to disable Microsoft user ${externalId}: ${error.message}`
			);
		}
	}

	/**
	 * Restore a file from Recycle Bin (for undo functionality)
	 */
	async restoreFile(undoAction: RestoreFileAction): Promise<void> {
		await this.ensureValidToken();

		try {
			const driveId = undoAction.fileId;
			if (!driveId) {
				throw new Error("driveId required in metadata for restoration");
			}

			// Microsoft Graph API doesn't have a direct "restore" endpoint
			// Files in recycle bin can be restored through the UI or SharePoint API
			// This would require accessing the recycle bin endpoint

			logger.info(
				`Restore functionality requires manual restoration from Recycle Bin for file ${undoAction.fileId}`
			);

			throw new Error(
				"Microsoft files must be restored manually from the Recycle Bin within 93 days. " +
					"Go to OneDrive/SharePoint > Recycle Bin to restore."
			);
		} catch (error: any) {
			throw new Error(
				`Failed to restore Microsoft file ${undoAction.fileId}: ${error.message}`
			);
		}
	}
}
