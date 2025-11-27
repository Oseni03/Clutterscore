import { LinearClient } from "@linear/sdk";
import { BaseConnector, ConnectorConfig, AuditData, UserData } from "./types";

export class LinearConnector extends BaseConnector {
	private client: LinearClient;

	constructor(config: ConnectorConfig) {
		super(config, "LINEAR");
		this.client = new LinearClient({ accessToken: config.accessToken });
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.client.viewer;
			return true;
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		throw new Error("Linear tokens must be refreshed via OAuth flow");
	}

	async fetchAuditData(): Promise<AuditData> {
		const users = await this.fetchUsers();

		return {
			files: [], // Linear doesn't have files
			users,
			storageUsedGb: 0,
			totalLicenses: users.length,
			activeUsers: users.filter((u) => u.licenseType === "active").length,
		};
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		const response = await this.client.users();

		for (const user of response.nodes) {
			users.push({
				email: user.email,
				name: user.name,
				role: user.admin ? "admin" : "user",
				lastActive: user.lastSeen ? new Date(user.lastSeen) : undefined,
				isGuest: user.guest || false,
				licenseType: user.active ? "active" : "inactive",
			});
		}

		return users;
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
