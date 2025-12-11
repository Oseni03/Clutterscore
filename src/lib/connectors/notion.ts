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
import { logger } from "../logger";

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
		const duplicateMap = new Map<string, string[]>();
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

				// Create duplicate key using hash OR name-size combination
				const nameSize = `${title}-${sizeMb}`;
				const duplicateKey = hash || nameSize;

				// Track duplicates by hash or name-size
				if (!duplicateMap.has(duplicateKey)) {
					duplicateMap.set(duplicateKey, []);
				}
				duplicateMap.get(duplicateKey)!.push(page.id);
				files.push({
					name: title,
					sizeMb,
					type: "DOCUMENT",
					source: "NOTION",
					externalId: page.id,
					mimeType: "application/vnd.notebook",
					fileHash: hash,
					url: page.url, // now safe
					path: `/${title}`,
					lastAccessed: new Date(page.last_edited_time), // safe
					ownerEmail: undefined,
					isPubliclyShared: page.public_url !== null, // safe
					sharedWith: [],
					isDuplicate: false, // Will be updated after processing all files
					duplicateGroup: duplicateKey,
				});
			}

			cursor = response.has_more
				? response.next_cursor || undefined
				: undefined;
		} while (cursor);

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
	 * Archive a Notion page by moving it to the trash
	 * Notion's API supports archiving pages by setting archived: true
	 * This is safer than permanent deletion and allows for recovery
	 */
	async archiveFile(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;
		try {
			// Archive the page (Notion's soft delete)
			await this.client.pages.update({
				page_id: externalId,
				archived: true,
			});

			logger.info(`Archived Notion page ${externalId}`);
		} catch (error) {
			throw new Error(
				`Failed to archive Notion page ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Revoke public access to a Notion page
	 */
	async updatePermissions(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;

		try {
			// Update page to disable public access
			await this.client.pages.update({
				page_id: externalId,
				// @ts-expect-error - public_url is not in the official types but works
				public_url: null,
			});

			logger.info(`Revoked public access for Notion page ${externalId}`);
		} catch (error) {
			throw new Error(
				`Failed to update permissions for Notion page ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Remove a guest user from Notion workspace
	 * Note: Notion API doesn't support user management directly
	 */
	async removeGuest(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;

		throw new Error(
			"Notion API does not support removing users programmatically. Please remove users manually through the Notion workspace settings."
		);
	}
}
