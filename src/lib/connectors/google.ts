/* eslint-disable @typescript-eslint/no-explicit-any */
import { google, drive_v3, admin_directory_v1 } from "googleapis";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";
import { logger } from "../logger";

export class GoogleConnector extends BaseConnector {
	private auth: any;
	private drive: drive_v3.Drive;
	private admin: admin_directory_v1.Admin;

	constructor(config: ConnectorConfig) {
		super(config, "GOOGLE");

		this.auth = new google.auth.OAuth2();
		this.auth.setCredentials({
			access_token: config.accessToken,
			refresh_token: config.refreshToken,
		});

		this.drive = google.drive({ version: "v3", auth: this.auth });
		this.admin = google.admin({ version: "directory_v1", auth: this.auth });
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.ensureValidToken();
			await this.drive.about.get({ fields: "user" });
			return true;
		} catch (error) {
			logger.error("Google connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		try {
			const { credentials } = await this.auth.refreshAccessToken();
			if (!credentials.access_token) {
				throw new Error("No access token returned");
			}
			return credentials.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Google token: ${(error as Error).message}`
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
		let pageToken: string | undefined;
		const duplicateMap = new Map<string, string[]>();

		do {
			try {
				const response = await this.drive.files.list({
					pageSize: 1000,
					pageToken,
					fields: "nextPageToken, files(id, name, size, mimeType, md5Checksum, webViewLink, owners, viewedByMeTime, shared, permissions, createdTime, modifiedTime)",
					supportsAllDrives: true,
					includeItemsFromAllDrives: true,
					q: "trashed = false", // Exclude trashed files
				});

				for (const file of response.data.files || []) {
					const sizeMb = file.size
						? this.bytesToMb(parseInt(file.size))
						: 0;
					const hash =
						file.md5Checksum ||
						this.generateFileHash(file.name || "Untitled", sizeMb);

					// Create duplicate key using hash OR name-size combination
					const nameSize = `${file.name || "Untitled"}-${sizeMb}`;
					const duplicateKey = hash || nameSize;

					// Track duplicates by hash or name-size
					if (!duplicateMap.has(duplicateKey)) {
						duplicateMap.set(duplicateKey, []);
					}
					duplicateMap.get(duplicateKey)!.push(file.id!);
					const sharedWith = this.extractSharedWith(
						file.permissions || []
					);

					files.push({
						name: file.name || "Untitled",
						sizeMb,
						type: this.inferFileType(file.mimeType || ""),
						source: "GOOGLE",
						externalId: file.id!,
						mimeType: file.mimeType || undefined,
						fileHash: hash,
						url: file.webViewLink || undefined,
						path: `/${file.name || "Untitled"}`,
						lastAccessed: file.viewedByMeTime
							? new Date(file.viewedByMeTime)
							: file.modifiedTime
								? new Date(file.modifiedTime)
								: file.createdTime
									? new Date(file.createdTime)
									: new Date(), // ✅ FIXED: Always provide a date
						ownerEmail: file.owners?.[0]?.emailAddress || "",
						isPubliclyShared:
							sharedWith.includes("anyone") ||
							sharedWith.includes("domain"),
						sharedWith: sharedWith.filter(
							(e) => e !== "anyone" && e !== "domain"
						),
						isDuplicate: false, // Will be updated after processing all files
						duplicateGroup: duplicateKey,
					});
				}

				pageToken = response.data.nextPageToken || undefined;
			} catch (error) {
				logger.error("Error fetching Google Drive files:", error);
				throw error;
			}
		} while (pageToken);

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
		let pageToken: string | undefined;

		try {
			do {
				const response = await this.admin.users.list({
					customer: "my_customer",
					maxResults: 500,
					pageToken,
					projection: "full",
				});

				for (const user of response.data.users || []) {
					users.push({
						email: user.primaryEmail!,
						name: user.name?.fullName || "Unknown User",
						role: user.isAdmin ? "admin" : "user",
						lastActive: user.lastLoginTime
							? new Date(user.lastLoginTime)
							: undefined,
						isGuest: false,
						licenseType: this.mapLicenseType(
							user.suspended || false,
							user.archived || false
						),
					});
				}

				pageToken = response.data.nextPageToken || undefined;
			} while (pageToken);
		} catch (error) {
			logger.error("Error fetching Google Workspace users:", error);
			// If admin API fails, return empty array (might not have admin access)
			return [];
		}

		return users;
	}

	private extractSharedWith(
		permissions: drive_v3.Schema$Permission[]
	): string[] {
		const shared: string[] = [];

		permissions.forEach((perm) => {
			if (perm.type === "anyone") {
				shared.push("anyone");
			} else if (perm.type === "domain") {
				shared.push("domain");
			} else if (perm.emailAddress) {
				shared.push(perm.emailAddress);
			}
		});

		return shared;
	}

	private mapLicenseType(suspended: boolean, archived: boolean): string {
		if (archived) return "archived";
		if (suspended) return "suspended";
		return "active";
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

	// ============================================================================
	// EXECUTION METHODS
	// ============================================================================

	/**
	 * Delete a file permanently from Google Drive
	 */
	async deleteFile(
		externalId: string,
		_metadata: Record<string, unknown>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			await this.drive.files.delete({
				fileId: externalId,
				supportsAllDrives: true,
			});
		} catch (error) {
			throw new Error(
				`Failed to delete Google Drive file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Update file permissions to restrict access (remove public/domain sharing)
	 */
	async updatePermissions(
		externalId: string,
		_metadata: Record<string, unknown>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			// Get current permissions
			const response = await this.drive.permissions.list({
				fileId: externalId,
				supportsAllDrives: true,
				fields: "permissions(id, type, role)",
			});

			// Remove anyone/domain permissions
			const permissionsToRemove = (
				response.data.permissions || []
			).filter((p) => p.type === "anyone" || p.type === "domain");

			for (const perm of permissionsToRemove) {
				await this.drive.permissions.delete({
					fileId: externalId,
					permissionId: perm.id!,
					supportsAllDrives: true,
				});
			}
		} catch (error) {
			throw new Error(
				`Failed to update permissions for Google Drive file ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Remove a guest user from the Google Workspace
	 */
	async removeGuest(
		externalId: string,
		_metadata: Record<string, unknown>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			await this.admin.users.delete({
				userKey: externalId, // Email address
			});
		} catch (error) {
			throw new Error(
				`Failed to remove guest user ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Disable a user account in Google Workspace
	 */
	async disableUser(
		externalId: string,
		_metadata: Record<string, unknown>
	): Promise<void> {
		void _metadata;
		await this.ensureValidToken();

		try {
			await this.admin.users.update({
				userKey: externalId, // Email address
				requestBody: {
					suspended: true,
				},
			});
		} catch (error) {
			throw new Error(
				`Failed to disable user ${externalId}: ${(error as Error).message}`
			);
		}
	}
}
