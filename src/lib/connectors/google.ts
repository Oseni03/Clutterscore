import { google, drive_v3, admin_directory_v1 } from "googleapis";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

export class GoogleConnector extends BaseConnector {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			await this.drive.about.get({ fields: "user" });
			return true;
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		const { credentials } = await this.auth.refreshAccessToken();
		return credentials.access_token!;
	}

	async fetchAuditData(): Promise<AuditData> {
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
			storageUsedGb: Math.round((totalStorage / 1024) * 100) / 100,
			totalLicenses: users.length,
			activeUsers,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		let pageToken: string | undefined;
		const fileHashes = new Map<string, string[]>();

		do {
			const response = await this.drive.files.list({
				pageSize: 1000,
				pageToken,
				fields: "nextPageToken, files(id, name, size, mimeType, md5Checksum, webViewLink, owners, viewedByMeTime, shared, permissions, createdTime)",
				supportsAllDrives: true,
				includeItemsFromAllDrives: true,
			});

			for (const file of response.data.files || []) {
				const sizeMb = file.size
					? this.bytesToMb(parseInt(file.size))
					: 0;
				const hash =
					file.md5Checksum ||
					this.generateFileHash(file.name!, sizeMb);

				// Track duplicates
				if (!fileHashes.has(hash)) {
					fileHashes.set(hash, []);
				}
				fileHashes.get(hash)!.push(file.id!);

				const isDuplicate = fileHashes.get(hash)!.length > 1;
				const sharedWith = this.extractSharedWith(
					file.permissions || []
				);

				files.push({
					name: file.name || "Untitled",
					sizeMb,
					type: this.inferFileType(file.mimeType || ""),
					source: "GOOGLE",
					mimeType: file.mimeType || undefined,
					fileHash: hash,
					url: file.webViewLink || undefined,
					path: `/${file.name}`,
					lastAccessed: file.viewedByMeTime
						? new Date(file.viewedByMeTime)
						: file.createdTime
							? new Date(file.createdTime)
							: undefined,
					ownerEmail: file.owners?.[0]?.emailAddress || "",
					isPubliclyShared:
						sharedWith.includes("anyone") ||
						sharedWith.includes("domain"),
					sharedWith: sharedWith.filter(
						(e) => e !== "anyone" && e !== "domain"
					),
					isDuplicate,
					duplicateGroup: isDuplicate ? hash : undefined,
				});
			}

			pageToken = response.data.nextPageToken || undefined;
		} while (pageToken);

		return files;
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let pageToken: string | undefined;

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
					name: user.name?.fullName || "Untitled",
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

	private mapLicenseType(suspended?: boolean, archived?: boolean): string {
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
}
