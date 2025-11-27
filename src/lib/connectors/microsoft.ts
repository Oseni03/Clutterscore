/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@microsoft/microsoft-graph-client";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

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
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		throw new Error("Token refresh must be handled by OAuth flow");
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
		const fileHashes = new Map<string, string[]>();

		// Fetch from OneDrive and SharePoint
		const drives = await this.getAllDrives();

		for (const drive of drives) {
			let nextLink: string | undefined =
				`/drives/${drive.id}/root/children`;

			while (nextLink) {
				const response = await this.client
					.api(nextLink)
					.top(999)
					.select(
						"id,name,size,file,webUrl,lastModifiedDateTime,createdBy,shared,permissions"
					)
					.get();

				for (const item of response.value || []) {
					if (!item.file) continue; // Skip folders

					const sizeMb = item.size ? this.bytesToMb(item.size) : 0;
					const hash =
						item.file?.hashes?.sha256Hash ||
						this.generateFileHash(item.name, sizeMb);

					// Track duplicates
					if (!fileHashes.has(hash)) {
						fileHashes.set(hash, []);
					}
					fileHashes.get(hash)!.push(item.id);

					const isDuplicate = fileHashes.get(hash)!.length > 1;
					const sharedWith = await this.getSharedWith(
						drive.id,
						item.id
					);

					files.push({
						name: item.name,
						sizeMb,
						type: this.inferFileType(item.file.mimeType || ""),
						source: "MICROSOFT",
						mimeType: item.file.mimeType,
						fileHash: hash,
						url: item.webUrl,
						path: item.parentReference?.path || `/${item.name}`,
						lastAccessed: item.lastModifiedDateTime
							? new Date(item.lastModifiedDateTime)
							: undefined,
						ownerEmail: item.createdBy?.user?.email,
						isPubliclyShared:
							item.shared?.scope === "anonymous" ||
							item.shared?.scope === "organization",
						sharedWith,
						isDuplicate,
						duplicateGroup: isDuplicate ? hash : undefined,
					});
				}

				nextLink = response["@odata.nextLink"];
			}
		}

		return files;
	}

	private async getAllDrives(): Promise<any[]> {
		const drives: any[] = [];

		// Get user's OneDrive
		const myDrive = await this.client.api("/me/drive").get();
		drives.push(myDrive);

		// Get SharePoint sites drives
		try {
			const sites = await this.client
				.api("/sites")
				.filter("siteCollection/root ne null")
				.get();

			for (const site of sites.value || []) {
				try {
					const siteDrives = await this.client
						.api(`/sites/${site.id}/drives`)
						.get();
					drives.push(...(siteDrives.value || []));
				} catch {
					// Skip sites we can't access
				}
			}
		} catch {
			// Skip if no access to sites
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
						if (identity.user?.email)
							emails.push(identity.user.email);
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

		while (nextLink) {
			const response = await this.client
				.api(nextLink)
				.top(999)
				.select(
					"id,displayName,mail,userPrincipalName,accountEnabled,signInActivity,assignedLicenses"
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

		return users;
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

	async identifyGuestUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.isGuest);
	}
}
