/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@notionhq/client";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

export class NotionConnector extends BaseConnector {
	private client: Client;

	constructor(config: ConnectorConfig) {
		super(config, "NOTION");
		this.client = new Client({ auth: config.accessToken });
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.client.users.me({});
			return true;
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		throw new Error("Notion tokens do not expire");
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
			activeUsers: users.length, // Notion doesn't provide last active data easily
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		let cursor: string | undefined;

		do {
			const response = await this.client.search({
				filter: { property: "object", value: "page" },
				start_cursor: cursor,
				page_size: 100,
			});

			for (const page of response.results) {
				// Ensure we have a full PageObjectResponse
				if (page.object !== "page" || !("properties" in page)) continue;

				const properties = page.properties as Record<string, any>;

				const title =
					properties?.title?.title?.[0]?.plain_text || "Untitled";

				// Fake size estimate
				const sizeMb = 0.1;

				const hash = this.generateFileHash(title, sizeMb);

				files.push({
					name: title,
					sizeMb,
					type: "DOCUMENT",
					source: "NOTION",
					mimeType: "application/vnd.notebook",
					fileHash: hash,
					url: page.url, // now safe
					path: `/${title}`,
					lastAccessed: new Date(page.last_edited_time), // safe
					ownerEmail: undefined,
					isPubliclyShared: page.public_url !== null, // safe
					sharedWith: [],
					isDuplicate: false,
					duplicateGroup: undefined,
				});
			}

			cursor = response.has_more
				? response.next_cursor || undefined
				: undefined;
		} while (cursor);

		return files;
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let cursor: string | undefined;

		do {
			const response = await this.client.users.list({
				start_cursor: cursor,
				page_size: 100,
			});

			for (const user of response.results) {
				if (user.type !== "person") continue;

				users.push({
					email: user.person?.email || `${user.id}@notion.local`,
					name: user.name || undefined,
					role: "user",
					lastActive: undefined,
					isGuest: false,
					licenseType: "full",
				});
			}

			cursor = response.has_more
				? response.next_cursor || undefined
				: undefined;
		} while (cursor);

		return users;
	}

	private generateFileHash(name: string, size: number): string {
		return crypto
			.createHash("sha256")
			.update(`${name}-${size}`)
			.digest("hex");
	}
}
