/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../logger";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

interface FigmaProject {
	id: string;
	name: string;
}

export class FigmaConnector extends BaseConnector {
	private baseUrl = "https://api.figma.com/v1";

	constructor(config: ConnectorConfig) {
		super(config, "FIGMA");
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.ensureValidToken();
			const response = await this.makeRequest("/me");
			return !!response.id;
		} catch (error) {
			logger.error("Figma connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		// Figma personal access tokens don't expire
		// OAuth tokens would need refresh logic here
		throw new Error(
			"Figma personal access tokens do not expire. Use OAuth for token refresh."
		);
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
			activeUsers: users.filter((u) => u.licenseType === "full").length,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		const duplicateMap = new Map<string, string[]>();

		try {
			const teamProjects = await this.getTeamProjects();

			for (const project of teamProjects) {
				const projectFiles = await this.makeRequest(
					`/projects/${project.id}/files`
				);

				for (const file of projectFiles.files || []) {
					// Figma doesn't provide file sizes, estimate based on complexity
					const sizeMb = 5; // Rough estimate for design files
					const hash = this.generateFileHash(file.name, sizeMb);

					// Create duplicate key using hash OR name-size combination
					const nameSize = `${file.name}-${sizeMb}`;
					const duplicateKey = hash || nameSize;

					// Track duplicates by hash or name-size
					if (!duplicateMap.has(duplicateKey)) {
						duplicateMap.set(duplicateKey, []);
					}
					duplicateMap.get(duplicateKey)!.push(file.key);
					files.push({
						name: file.name,
						sizeMb,
						type: "OTHER", // Figma files are design files
						source: "FIGMA",
						externalId: file.key,
						mimeType: "application/figma",
						fileHash: hash,
						url: `https://www.figma.com/file/${file.key}`,
						path: `/${project.name}/${file.name}`,
						lastAccessed: new Date(file.last_modified),
						ownerEmail: undefined, // Figma API doesn't expose owner easily
						isPubliclyShared: false, // Would need to check file permissions separately
						sharedWith: [],
						isDuplicate: false, // Will be updated after processing all files
						duplicateGroup: duplicateKey,
					});
				}
			}
		} catch (error) {
			logger.error("Error fetching Figma files:", error);
		}

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

	private async getTeamProjects(): Promise<FigmaProject[]> {
		try {
			const me = await this.makeRequest("/me");
			const teamId = me.team_id;

			if (!teamId) {
				return [];
			}

			const response = await this.makeRequest(
				`/teams/${teamId}/projects`
			);
			return response.projects || [];
		} catch (error) {
			logger.error("Error fetching Figma team projects:", error);
			return [];
		}
	}

	private async fetchUsers(): Promise<UserData[]> {
		try {
			const me = await this.makeRequest("/me");
			const teamId = me.team_id;

			if (!teamId) {
				// Personal account - return current user
				return [
					{
						email: me.email,
						name: me.handle,
						role: "owner",
						lastActive: undefined,
						isGuest: false,
						licenseType: "full",
					},
				];
			}

			// For team accounts, Figma API has limited user listing
			// This would require organization-level API access
			return [
				{
					email: me.email,
					name: me.handle,
					role: "user",
					lastActive: undefined,
					isGuest: false,
					licenseType: "full",
				},
			];
		} catch (error) {
			logger.error("Error fetching Figma users:", error);
			return [];
		}
	}

	private async makeRequest(
		endpoint: string,
		options: RequestInit = {}
	): Promise<any> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				"X-Figma-Token": this.config.accessToken,
				"Content-Type": "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Figma API error (${response.status}): ${errorText || response.statusText}`
			);
		}

		return response.json();
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
	 * Delete a Figma file
	 * Note: Figma API doesn't support file deletion via API
	 * This would need to be done manually or through browser automation
	 */
	async archiveFile(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void externalId;
		void _metadata;
		throw new Error(
			"Figma API does not support file archival. Files must be archived/deleted manually through the Figma interface."
		);
	}

	/**
	 * Update file permissions
	 * Note: Figma API has limited permission management
	 */
	async updatePermissions(
		externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void externalId;
		void _metadata;
		throw new Error(
			"Figma API has limited permission management. Use Figma's web interface for permission changes."
		);
	}
}
