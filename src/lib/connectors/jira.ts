import { Version3Client } from "jira.js";
import { BaseConnector, ConnectorConfig, AuditData, UserData } from "./types";

export class JiraConnector extends BaseConnector {
	private client: Version3Client;

	constructor(config: ConnectorConfig) {
		super(config, "JIRA");

		this.client = new Version3Client({
			host: process.env.JIRA_HOST!,
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
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		throw new Error("Jira tokens must be refreshed via OAuth flow");
	}

	async fetchAuditData(): Promise<AuditData> {
		const users = await this.fetchUsers();

		return {
			files: [], // Jira doesn't have traditional files
			users,
			storageUsedGb: 0,
			totalLicenses: users.length,
			activeUsers: users.filter((u) => u.licenseType === "active").length,
		};
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let startAt = 0;
		const maxResults = 50;

		while (true) {
			const response = await this.client.users.getAllUsers({
				startAt,
				maxResults,
			});

			if (!response || response.length === 0) break;

			for (const user of response) {
				users.push({
					email: user.emailAddress || `${user.accountId}@jira.local`,
					name: user.displayName,
					role: "user",
					lastActive: undefined, // Jira doesn't provide this easily
					isGuest: false,
					licenseType: user.active ? "active" : "inactive",
				});
			}

			if (response.length < maxResults) break;
			startAt += maxResults;
		}

		return users;
	}

	async identifyInactiveUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.licenseType === "inactive");
	}
}
