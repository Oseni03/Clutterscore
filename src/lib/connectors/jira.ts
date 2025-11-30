import { Version3Client } from "jira.js";
import { BaseConnector, ConnectorConfig, AuditData, UserData } from "./types";
import { Issue } from "jira.js/version3/models/issue";

export class JiraConnector extends BaseConnector {
	private client: Version3Client;
	private cloudId: string;

	constructor(config: ConnectorConfig) {
		super(config, "JIRA");

		// Extract cloudId from metadata
		if (!config.metadata?.cloudId) {
			throw new Error(
				"Jira cloudId is required in connector configuration"
			);
		}

		this.cloudId = config.metadata.cloudId;

		// Initialize Jira client with cloudId-based host
		this.client = new Version3Client({
			host: `https://api.atlassian.com/ex/jira/${this.cloudId}`,
			authentication: {
				oauth2: {
					accessToken: config.accessToken,
				},
			},
		});
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.client.myself.getCurrentUser();
			return true;
		} catch (error) {
			console.error("Jira connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		if (!this.config.refreshToken) {
			throw new Error("No refresh token available for Jira connector");
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
				throw new Error(`Jira token refresh failed: ${error}`);
			}

			const data = await response.json();

			// Update client with new token
			this.client = new Version3Client({
				host: `https://api.atlassian.com/ex/jira/${this.cloudId}`,
				authentication: {
					oauth2: {
						accessToken: data.access_token,
					},
				},
			});

			return data.access_token;
		} catch (error) {
			throw new Error(
				`Failed to refresh Jira token: ${(error as Error).message}`
			);
		}
	}

	async fetchAuditData(): Promise<AuditData> {
		const [users, projects, issues] = await Promise.all([
			this.fetchUsers(),
			this.fetchProjects(),
			this.fetchRecentIssues(),
		]);

		// Estimate storage based on attachments and issue count
		const storageEstimate = await this.estimateStorageUsage();

		return {
			files: [], // Jira doesn't have traditional files, but has attachments
			users,
			storageUsedGb: storageEstimate,
			totalLicenses: users.length,
			activeUsers: users.filter((u) => u.licenseType === "active").length,
			metadata: {
				projects: projects.length,
				totalIssues: issues.total,
				cloudId: this.cloudId,
				siteName: this.config.metadata?.siteName,
				siteUrl: this.config.metadata?.siteUrl,
			},
		};
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let startAt = 0;
		const maxResults = 50;

		while (true) {
			try {
				const response = await this.client.users.getAllUsers({
					startAt,
					maxResults,
				});

				if (!response || response.length === 0) break;

				for (const user of response) {
					users.push({
						email:
							user.emailAddress || `${user.accountId}@jira.local`,
						name: user.displayName || "Unknown User",
						role:
							user.accountType === "atlassian" ? "user" : "guest",
						lastActive: undefined, // Jira API doesn't provide this directly
						isGuest: user.accountType !== "atlassian",
						licenseType: user.active ? "active" : "inactive",
						metadata: {
							accountId: user.accountId,
							accountType: user.accountType,
							avatarUrl: user.avatarUrls?.["48x48"],
							locale: user.locale,
							timezone: user.timeZone,
						},
					});
				}

				if (response.length < maxResults) break;
				startAt += maxResults;
			} catch (error) {
				console.error("Error fetching Jira users:", error);
				break;
			}
		}

		return users;
	}

	private async fetchProjects(): Promise<
		Array<{ id: string; key: string; name: string; lead: string }>
	> {
		try {
			const response = await this.client.projects.searchProjects({
				maxResults: 100,
			});

			return (
				response.values?.map((project) => ({
					id: project.id!,
					key: project.key!,
					name: project.name!,
					lead: project.lead?.displayName || "Unknown",
				})) || []
			);
		} catch (error) {
			console.error("Error fetching Jira projects:", error);
			return [];
		}
	}

	private async fetchRecentIssues(): Promise<{
		total: number;
		issues: Issue[];
	}> {
		try {
			const response =
				await this.client.issueSearch.searchForIssuesUsingJql({
					jql: "ORDER BY created DESC",
					maxResults: 1,
					fields: ["summary"],
				});

			return {
				total: response.total || 0,
				issues: response.issues || [],
			};
		} catch (error) {
			console.error("Error fetching Jira issues:", error);
			return { total: 0, issues: [] };
		}
	}

	private async estimateStorageUsage(): Promise<number> {
		// Jira doesn't provide direct storage metrics via API
		// Estimate based on attachment count and average size
		try {
			// Search for issues with attachments
			const response =
				await this.client.issueSearch.searchForIssuesUsingJql({
					jql: "attachments is not EMPTY",
					maxResults: 0, // Only need the count
					fields: [],
				});

			const issuesWithAttachments = response.total || 0;

			// Rough estimate: 2MB per issue with attachments
			const estimatedMb = issuesWithAttachments * 2;
			return estimatedMb / 1024; // Convert to GB
		} catch (error) {
			console.error("Error estimating Jira storage:", error);
			return 0;
		}
	}

	async identifyInactiveUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();

		// Additionally, identify users with no recent activity
		const usersWithActivity = await this.getUsersWithRecentActivity();
		const activeAccountIds = new Set(usersWithActivity);

		return users.filter(
			(u) =>
				u.licenseType === "inactive" ||
				!activeAccountIds.has(u.metadata?.accountId)
		);
	}

	private async getUsersWithRecentActivity(): Promise<string[]> {
		try {
			// Find users who created or updated issues in the last 90 days
			const ninetyDaysAgo = new Date();
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
			const dateStr = ninetyDaysAgo.toISOString().split("T")[0];

			const response =
				await this.client.issueSearch.searchForIssuesUsingJql({
					jql: `(created >= "${dateStr}" OR updated >= "${dateStr}")`,
					maxResults: 1000,
					fields: ["creator", "reporter", "assignee"],
				});

			const activeUsers = new Set<string>();

			response.issues?.forEach((issue) => {
				if (issue.fields.creator?.accountId) {
					activeUsers.add(issue.fields.creator.accountId);
				}
				if (issue.fields.reporter?.accountId) {
					activeUsers.add(issue.fields.reporter.accountId);
				}
				if (issue.fields.assignee?.accountId) {
					activeUsers.add(issue.fields.assignee.accountId);
				}
			});

			return Array.from(activeUsers);
		} catch (error) {
			console.error("Error fetching Jira user activity:", error);
			return [];
		}
	}

	async identifyStaleProjects(): Promise<
		Array<{
			id: string;
			name: string;
			key: string;
			lastActivity: Date | null;
			issueCount: number;
		}>
	> {
		try {
			const projects = await this.fetchProjects();
			const staleProjects: Array<{
				id: string;
				name: string;
				key: string;
				lastActivity: Date | null;
				issueCount: number;
			}> = [];

			for (const project of projects) {
				// Get last updated issue in project
				const response =
					await this.client.issueSearch.searchForIssuesUsingJql({
						jql: `project = ${project.key} ORDER BY updated DESC`,
						maxResults: 1,
						fields: ["updated"],
					});

				const issueCount = response.total || 0;
				const lastIssue = response.issues?.[0];
				const lastActivity = lastIssue?.fields.updated
					? new Date(lastIssue.fields.updated)
					: null;

				// Consider stale if no activity in 180 days or no issues
				const isStale =
					issueCount === 0 ||
					(lastActivity &&
						Date.now() - lastActivity.getTime() >
							180 * 24 * 60 * 60 * 1000);

				if (isStale) {
					staleProjects.push({
						id: project.id,
						name: project.name,
						key: project.key,
						lastActivity,
						issueCount,
					});
				}
			}

			return staleProjects;
		} catch (error) {
			console.error("Error identifying stale Jira projects:", error);
			return [];
		}
	}

	async getCloudId(): Promise<string> {
		return this.cloudId;
	}

	async getSiteInfo(): Promise<{
		cloudId: string;
		name: string;
		url: string;
		scopes: string[];
	}> {
		return {
			cloudId: this.cloudId,
			name: this.config.metadata?.siteName || "Unknown Site",
			url: this.config.metadata?.siteUrl || "",
			scopes: this.config.metadata?.scopes || [],
		};
	}
}
