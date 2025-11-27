/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
} from "./types";
import crypto from "crypto";

export class FigmaConnector extends BaseConnector {
	private baseUrl = "https://api.figma.com/v1";

	constructor(config: ConnectorConfig) {
		super(config, "FIGMA");
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await this.makeRequest("/me");
			return !!response.id;
		} catch {
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		throw new Error("Figma personal access tokens do not expire");
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
		const teamProjects = await this.getTeamProjects();

		for (const project of teamProjects) {
			const projectFiles = await this.makeRequest(
				`/projects/${project.id}/files`
			);

			for (const file of projectFiles.files || []) {
				// Figma doesn't provide file sizes, estimate based on complexity
				const sizeMb = 5; // Rough estimate
				const hash = this.generateFileHash(file.name, sizeMb);

				files.push({
					name: file.name,
					sizeMb,
					type: "OTHER",
					source: "FIGMA",
					mimeType: "application/figma",
					fileHash: hash,
					url: `https://www.figma.com/file/${file.key}`,
					path: `/${project.name}/${file.name}`,
					lastAccessed: new Date(file.last_modified),
					ownerEmail: undefined,
					isPubliclyShared: false,
					sharedWith: [],
					isDuplicate: false,
					duplicateGroup: undefined,
				});
			}
		}

		return files;
	}

	private async getTeamProjects(): Promise<any[]> {
		const me = await this.makeRequest("/me");
		const teamId = me.team_id;

		if (!teamId) return [];

		const response = await this.makeRequest(`/teams/${teamId}/projects`);
		return response.projects || [];
	}

	private async fetchUsers(): Promise<UserData[]> {
		const me = await this.makeRequest("/me");
		const teamId = me.team_id;

		if (!teamId) {
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

		// Figma API doesn't provide team member list in basic plan
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
	}

	private async makeRequest(endpoint: string): Promise<any> {
		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			headers: {
				"X-Figma-Token": this.config.accessToken,
			},
		});

		if (!response.ok) {
			throw new Error(`Figma API error: ${response.statusText}`);
		}

		return response.json();
	}

	private generateFileHash(name: string, size: number): string {
		return crypto
			.createHash("sha256")
			.update(`${name}-${size}`)
			.digest("hex");
	}
}
