/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@notionhq/client";
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
			activeUsers: users.length,
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
				if (page.object !== "page" || !("properties" in page)) continue;

				const properties = page.properties as Record<string, any>;
				const title =
					properties?.title?.title?.[0]?.plain_text || "Untitled";

				const sizeMb = 0.1; // Estimate
				const hash = this.generateFileHash(title, sizeMb);
				const nameSize = `${title}-${sizeMb}`;
				const duplicateKey = hash || nameSize;

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
					url: page.url,
					path: `/${title}`,
					lastAccessed: new Date(page.last_edited_time),
					ownerEmail: undefined,
					isPubliclyShared: page.public_url !== null,
					sharedWith: [],
					isDuplicate: false,
					duplicateGroup: duplicateKey,
				});
			}

			cursor = response.has_more
				? response.next_cursor || undefined
				: undefined;
		} while (cursor);

		// Mark duplicates
		for (const file of files) {
			const duplicateKey = file.duplicateGroup!;
			const duplicateIds = duplicateMap.get(duplicateKey);

			if (duplicateIds && duplicateIds.length > 1) {
				file.isDuplicate = true;
			} else {
				file.duplicateGroup = undefined;
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
	// EXECUTION METHODS WITH METADATA CAPTURE
	// ============================================================================

	/**
	 * Archive a Notion page by moving it to the trash
	 * Notion supports soft delete (archived: true) which can be undone
	 */
	async archiveFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		try {
			// Get page info before archiving for undo metadata
			const page = await this.client.pages.retrieve({
				page_id: externalId,
			});

			// Store original state for undo
			if ("properties" in page) {
				const properties = page.properties as Record<string, any>;
				const title =
					properties?.title?.title?.[0]?.plain_text || "Untitled";

				metadata.originalState = {
					pageId: page.id,
					title,
					url: page.url,
					isArchived: page.archived,
					lastEditedTime: page.last_edited_time,
					publicUrl: (page as any).public_url || null,
				};
			}

			// Archive the page (soft delete)
			await this.client.pages.update({
				page_id: externalId,
				archived: true,
			});

			metadata.archivedAt = new Date().toISOString();
			logger.info(
				`Archived Notion page ${externalId} (${metadata.originalState?.title || "Untitled"})`
			);
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
		metadata: Record<string, any>
	): Promise<void> {
		try {
			// Get page info before updating for undo metadata
			const page = await this.client.pages.retrieve({
				page_id: externalId,
			});

			// Store original sharing state
			if ("properties" in page) {
				metadata.originalSharing = {
					isPubliclyShared: (page as any).public_url !== null,
					publicUrl: (page as any).public_url || null,
				};
			}

			// Disable public access
			await this.client.pages.update({
				page_id: externalId,
				// @ts-expect-error - public_url is not in official types but works
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
	 * Archive a Notion page (used for old/unused pages)
	 * Same as archiveFile but with different context
	 */
	async archivePage(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		return this.archiveFile(externalId, metadata);
	}

	/**
	 * Remove a guest user from Notion workspace
	 * Note: Notion API doesn't support user management directly
	 */
	async removeGuest(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _metadata;

		throw new Error(
			"Notion API does not support removing users programmatically. " +
				"Please remove users manually through the Notion workspace settings."
		);
	}

	// ============================================================================
	// UNDO METHODS - Restore previously executed actions
	// ============================================================================

	/**
	 * Restore an archived Notion page
	 * Notion supports unarchiving pages by setting archived: false
	 */
	async restoreFile(undoAction: RestoreFileAction): Promise<void> {
		const { externalId, fileName, originalMetadata } = undoAction;

		try {
			// Verify page exists and is archived
			const page = await this.client.pages.retrieve({
				page_id: externalId || "",
			});

			if (!("archived" in page)) {
				throw new Error("Invalid page object");
			}

			if (!page.archived) {
				logger.info(`Page ${fileName} (${externalId}) is not archived`);
				return;
			}

			// Unarchive the page
			await this.client.pages.update({
				page_id: externalId || "",
				archived: false,
			});

			logger.info(
				`Restored Notion page ${fileName} (${externalId}) from archive`
			);
		} catch (error: any) {
			if (error.code === "object_not_found") {
				throw new Error(
					`Page ${fileName} not found. It may have been permanently deleted.`
				);
			}
			if (error.code === "validation_error") {
				throw new Error(
					`Cannot restore page ${fileName}: Invalid page ID or insufficient permissions.`
				);
			}
			throw new Error(`Failed to restore Notion page: ${error.message}`);
		}
	}

	/**
	 * Restore public access to a Notion page
	 * Note: Notion API doesn't support directly enabling public URLs
	 * This is a limitation of the Notion API
	 */
	async restorePermissions(
		undoAction: RestorePermissionsAction
	): Promise<void> {
		const { fileId, fileName, originalSharing } = undoAction;

		try {
			// Check if page was originally public
			if (!originalSharing?.isPubliclyShared) {
				logger.info(
					`Page ${fileName} was not originally public, skipping restore`
				);
				return;
			}

			// Unfortunately, Notion API doesn't support programmatically enabling public URLs
			// You can only disable them (set to null)
			// To re-enable, users must do it manually in the Notion UI

			throw new Error(
				`Cannot restore public access for Notion page "${fileName}". ` +
					`Notion's API does not support enabling public URLs programmatically. ` +
					`Please enable public sharing manually in the Notion UI: ` +
					`Share → Publish to web → Turn on public access.`
			);
		} catch (error) {
			if (
				(error as Error).message.includes(
					"Cannot restore public access"
				)
			) {
				throw error; // Re-throw our custom message
			}
			throw new Error(
				`Failed to restore permissions for Notion page: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Restore an archived page (alias for restoreFile)
	 */
	async restorePage(undoAction: RestoreFileAction): Promise<void> {
		return this.restoreFile(undoAction);
	}

	// ============================================================================
	// HELPER METHODS
	// ============================================================================

	/**
	 * Get detailed page information
	 * Useful for debugging and audit trails
	 */
	async getPageInfo(pageId: string): Promise<any> {
		try {
			return await this.client.pages.retrieve({ page_id: pageId });
		} catch (error) {
			throw new Error(
				`Failed to get page info: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Check if a page is currently archived
	 */
	async isPageArchived(pageId: string): Promise<boolean> {
		try {
			const page = await this.client.pages.retrieve({ page_id: pageId });
			return "archived" in page ? page.archived : false;
		} catch (error) {
			throw new Error(
				`Failed to check page status: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Check if a page is publicly accessible
	 */
	async isPagePublic(pageId: string): Promise<boolean> {
		try {
			const page = await this.client.pages.retrieve({ page_id: pageId });
			return (page as any).public_url !== null;
		} catch (error) {
			throw new Error(
				`Failed to check page public status: ${(error as Error).message}`
			);
		}
	}
}
