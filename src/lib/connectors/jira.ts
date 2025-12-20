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

export class JiraConnector extends BaseConnector {
	private baseUrl: string;
	private email: string;

	constructor(config: ConnectorConfig) {
		super(config, "JIRA");
		// Jira uses email + API token for authentication
		this.baseUrl = config.metadata?.cloudId
			? `https://api.atlassian.com/ex/jira/${config.metadata.cloudId}`
			: config.metadata?.baseUrl || "";
		this.email = config.metadata?.email || "";
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.ensureValidToken();
			const response = await this.makeRequest("/rest/api/3/myself");
			return !!response.accountId;
		} catch (error) {
			logger.error("Jira connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available for Jira");
		}

		try {
			const response = await fetch(
				"https://auth.atlassian.com/oauth/token",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						grant_type: "refresh_token",
						client_id: process.env.JIRA_CLIENT_ID!,
						client_secret: process.env.JIRA_CLIENT_SECRET!,
						refresh_token: this.config.refreshToken,
					}),
				}
			);

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Token refresh failed: ${error}`);
			}

			const data = await response.json();

			return data.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Jira token: ${(error as Error).message}`
			);
		}
	}

	async fetchUserCount(): Promise<number> {
		// Jira doesn't provide reliable user count for all license types
		return 0;
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
		const duplicateMap = new Map<string, string[]>();

		try {
			let startAt = 0;
			const maxResults = 100;
			let total = 0;

			do {
				// Fetch issues with attachments
				const response = await this.makeRequest(
					`/rest/api/3/search?jql=attachments IS NOT EMPTY&startAt=${startAt}&maxResults=${maxResults}&fields=attachment,key,summary,created,updated`
				);

				total = response.total;

				for (const issue of response.issues || []) {
					for (const attachment of issue.fields?.attachment || []) {
						const sizeMb = this.bytesToMb(attachment.size || 0);
						const hash = this.generateFileHash(
							attachment.filename,
							sizeMb
						);

						// Create duplicate key using hash OR name-size combination
						const nameSize = `${attachment.filename}-${sizeMb}`;
						const duplicateKey = hash || nameSize;

						// Track duplicates by hash or name-size
						if (!duplicateMap.has(duplicateKey)) {
							duplicateMap.set(duplicateKey, []);
						}
						duplicateMap.get(duplicateKey)!.push(attachment.id);

						files.push({
							name: attachment.filename,
							sizeMb,
							type: this.inferFileType(attachment.mimeType || ""),
							source: "JIRA",
							externalId: attachment.id,
							mimeType: attachment.mimeType,
							fileHash: hash,
							url: attachment.content,
							path: `/${issue.key}/${attachment.filename}`,
							lastAccessed: attachment.created
								? new Date(attachment.created)
								: new Date(),
							ownerEmail:
								attachment.author?.emailAddress || undefined,
							isPubliclyShared: false,
							sharedWith: [],
							isDuplicate: false,
							duplicateGroup: duplicateKey,
						});
					}
				}

				startAt += maxResults;
			} while (startAt < total);

			logger.info(`Fetched ${files.length} attachments from Jira`);
		} catch (error) {
			logger.error("Error fetching Jira attachments:", error);
			throw error;
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

		return files;
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];

		try {
			const startAt = 0;
			const maxResults = 100;

			// Fetch all users with site access
			const response = await this.makeRequest(
				`/rest/api/3/users/search?startAt=${startAt}&maxResults=${maxResults}`
			);

			for (const user of response || []) {
				users.push({
					email: user.emailAddress || "",
					name: user.displayName || "Unknown User",
					role: user.accountType === "atlassian" ? "admin" : "user",
					lastActive: undefined, // Jira API doesn't expose last login easily
					isGuest: user.accountType === "customer",
					licenseType: user.active ? "active" : "inactive",
				});
			}

			logger.info(`Fetched ${users.length} Jira users`);
		} catch (error) {
			logger.error("Error fetching Jira users:", error);
			throw error;
		}

		return users;
	}

	private async makeRequest(
		endpoint: string,
		options: RequestInit = {}
	): Promise<any> {
		const auth = Buffer.from(
			`${this.email}:${this.config.accessToken}`
		).toString("base64");

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Basic ${auth}`,
				"Content-Type": "application/json",
				Accept: "application/json",
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Jira API error (${response.status}): ${errorText || response.statusText}`
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

	async identifyInactiveUsers(
		daysInactive: number = 90
	): Promise<UserData[]> {
		const users = await this.fetchUsers();
		// Jira doesn't provide last active, so we can only filter by inactive status
		return users.filter((u) => u.licenseType === "inactive");
	}

	async identifyGuestUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.isGuest);
	}

	/**
	 * Identify stale issues that haven't been updated in a while
	 */
	async identifyStaleIssues(daysStale: number = 180): Promise<any[]> {
		await this.ensureValidToken();

		const staleIssues: any[] = [];
		const cutoffDate = new Date(
			Date.now() - daysStale * 24 * 60 * 60 * 1000
		);
		const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

		try {
			let startAt = 0;
			const maxResults = 100;
			let total = 0;

			do {
				const response = await this.makeRequest(
					`/rest/api/3/search?jql=updated < "${cutoffDateStr}" AND status NOT IN (Done, Closed, Resolved)&startAt=${startAt}&maxResults=${maxResults}`
				);

				total = response.total;

				for (const issue of response.issues || []) {
					staleIssues.push({
						id: issue.id,
						key: issue.key,
						summary: issue.fields.summary,
						status: issue.fields.status.name,
						lastUpdated: new Date(issue.fields.updated),
						issueType: issue.fields.issuetype?.name,
						priority: issue.fields.priority?.name,
					});
				}

				startAt += maxResults;
			} while (startAt < total);

			logger.info(`Identified ${staleIssues.length} stale Jira issues`);
		} catch (error) {
			logger.error("Error identifying stale Jira issues:", error);
		}

		return staleIssues;
	}

	// ============================================================================
	// EXECUTION METHODS
	// ============================================================================

	/**
	 * Delete an attachment from Jira (permanent deletion)
	 * WARNING: Jira doesn't support archiving attachments - this is permanent
	 */
	async archiveFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get attachment info for logging before deletion
			const fileName = metadata?.name || "Unknown";
			const fileSizeMb = metadata?.size || 0;
			const issuePath = metadata?.path || "Unknown issue";

			// WARNING: This permanently deletes the attachment
			await this.makeRequest(`/rest/api/3/attachment/${externalId}`, {
				method: "DELETE",
			});

			logger.info(
				`Deleted Jira attachment "${fileName}" (${externalId}). ` +
					`Size: ${fileSizeMb} MB, Issue: ${issuePath}. ` +
					`WARNING: This deletion is permanent and cannot be undone.`
			);
		} catch (error) {
			throw new Error(
				`Failed to delete Jira attachment ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Close a stale issue
	 */
	async closeIssue(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			// Get issue info for logging
			const issueKey = metadata?.key || externalId;
			const issueSummary = metadata?.summary || "Unknown";

			// Get available transitions
			const transitions = await this.makeRequest(
				`/rest/api/3/issue/${externalId}/transitions`
			);

			// Find the "Close" or "Done" transition
			const closeTransition = transitions.transitions.find(
				(t: any) =>
					t.name.toLowerCase().includes("close") ||
					t.name.toLowerCase().includes("done") ||
					t.name.toLowerCase().includes("resolve")
			);

			if (closeTransition) {
				await this.makeRequest(
					`/rest/api/3/issue/${externalId}/transitions`,
					{
						method: "POST",
						body: JSON.stringify({
							transition: { id: closeTransition.id },
						}),
					}
				);

				logger.info(
					`Closed Jira issue "${issueKey}" (${externalId}): "${issueSummary}"`
				);
			} else {
				throw new Error(
					`No close transition available for issue ${externalId}`
				);
			}
		} catch (error) {
			throw new Error(
				`Failed to close Jira issue ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Remove user from project
	 */
	async removeGuest(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		try {
			const projectKey = metadata?.projectKey;
			const userName = metadata?.name || metadata?.email || externalId;

			if (!projectKey) {
				throw new Error(
					"Project key required to remove user from project"
				);
			}

			// Remove user from project role
			await this.makeRequest(
				`/rest/api/3/project/${projectKey}/role/${metadata.roleId || "10000"}/${externalId}`,
				{ method: "DELETE" }
			);

			logger.info(
				`Removed guest "${userName}" (${externalId}) from Jira project ${projectKey}`
			);
		} catch (error) {
			throw new Error(
				`Failed to remove Jira guest ${externalId}: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Deactivate a user account
	 * Note: Jira Cloud doesn't support user deactivation via REST API
	 */
	async disableUser(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		await this.ensureValidToken();

		const userName = metadata?.name || metadata?.email || externalId;

		// Jira Cloud doesn't support user deactivation via REST API
		logger.warn(
			`Cannot deactivate Jira user "${userName}" (${externalId}) via API. ` +
				`User deactivation must be done through the Jira admin interface.`
		);

		throw new Error(
			`Jira Cloud API does not support user deactivation. ` +
				`Please deactivate user "${userName}" manually through: ` +
				`Settings > User Management > ${userName} > Deactivate`
		);
	}

	/**
	 * Add comment to issue (for archival notification)
	 */
	async addArchiveComment(issueKey: string, comment: string): Promise<void> {
		await this.ensureValidToken();

		try {
			await this.makeRequest(`/rest/api/3/issue/${issueKey}/comment`, {
				method: "POST",
				body: JSON.stringify({
					body: {
						type: "doc",
						version: 1,
						content: [
							{
								type: "paragraph",
								content: [
									{
										type: "text",
										text: comment,
									},
								],
							},
						],
					},
				}),
			});

			logger.info(`Added archive comment to Jira issue ${issueKey}`);
		} catch (error) {
			throw new Error(
				`Failed to add comment to Jira issue ${issueKey}: ${(error as Error).message}`
			);
		}
	}
}
