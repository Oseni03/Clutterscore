import { Dropbox } from "dropbox";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

export class DropboxConnector extends BaseConnector {
	private client: Dropbox;

	constructor(config: ConnectorConfig) {
		super(config, "DROPBOX");
		this.client = new Dropbox({ accessToken: config.accessToken });
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.client.usersGetCurrentAccount();
			return true;
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available");
		}

		const response = await fetch("https://api.dropbox.com/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: this.config.refreshToken,
				client_id: process.env.DROPBOX_CLIENT_ID!,
				client_secret: process.env.DROPBOX_CLIENT_SECRET!,
			}),
		});

		const data = await response.json();
		return data.access_token;
	}

	async fetchAuditData(): Promise<AuditData> {
		const [files, users] = await Promise.all([
			this.fetchFiles(),
			this.fetchUsers(),
		]);

		const totalStorage = files.reduce((sum, f) => sum + f.sizeMb, 0);

		return {
			files,
			users,
			storageUsedGb: Math.round((totalStorage / 1024) * 100) / 100,
			totalLicenses: users.length,
			activeUsers: users.length,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		const fileHashes = new Map<string, string[]>();

		const listFiles = async (path: string = "") => {
			let cursor: string | undefined;

			do {
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
					const hash =
						entry.content_hash ||
						this.generateFileHash(entry.name, sizeMb);

					// Track duplicates
					if (!fileHashes.has(hash)) {
						fileHashes.set(hash, []);
					}
					fileHashes.get(hash)!.push(entry.id);

					const isDuplicate = fileHashes.get(hash)!.length > 1;
					const sharedInfo = await this.getSharedInfo(entry.id);

					files.push({
						name: entry.name,
						sizeMb,
						type: this.inferFileType(
							entry.media_info?.[".tag"] || ""
						),
						source: "DROPBOX",
						mimeType: "application/octet-stream",
						fileHash: hash,
						url: undefined,
						path: entry.path_display || `/${entry.name}`,
						lastAccessed: entry.client_modified
							? new Date(entry.client_modified)
							: undefined,
						ownerEmail: undefined,
						isPubliclyShared: sharedInfo.isPublic,
						sharedWith: sharedInfo.sharedWith,
						isDuplicate,
						duplicateGroup: isDuplicate ? hash : undefined,
					});
				}

				cursor = response.result.has_more
					? response.result.cursor
					: undefined;
			} while (cursor);
		};

		await listFiles("");
		return files;
	}

	private async getSharedInfo(fileId: string): Promise<{
		isPublic: boolean;
		sharedWith: string[];
	}> {
		try {
			const response = await this.client.sharingListFileMembers({
				file: fileId,
			});

			const members = response.result.users || [];

			return {
				isPublic: false,
				sharedWith: members
					.map((m) => m.user?.email) // ← email is inside m.user
					.filter((email): email is string => Boolean(email)),
			};
		} catch {
			return { isPublic: false, sharedWith: [] };
		}
	}

	private async fetchUsers(): Promise<UserData[]> {
		try {
			const response = await this.client.teamMembersListV2({});
			const members = response.result.members || [];

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return members.map((member: any) => ({
				email: member.profile.email,
				name: member.profile.name.display_name,
				role: member.role?.[".tag"] === "team_admin" ? "admin" : "user",
				lastActive: undefined,
				isGuest: false,
				licenseType:
					member.profile.status?.[".tag"] === "active"
						? "active"
						: "inactive",
			}));
		} catch {
			// Personal account - return current user
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
		}
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

	async identifyOldFiles(daysOld: number = 365): Promise<FileData[]> {
		const files = await this.fetchFiles();
		const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

		return files.filter(
			(f) => f.lastAccessed && f.lastAccessed < cutoffDate
		);
	}
}
