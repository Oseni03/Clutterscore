/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebClient } from "@slack/web-api";
import {
	BaseConnector,
	ConnectorConfig,
	AuditData,
	FileData,
	UserData,
	ChannelData,
} from "./types";
import crypto from "crypto";

export class SlackConnector extends BaseConnector {
	private client: WebClient;

	constructor(config: ConnectorConfig) {
		super(config, "SLACK");
		this.client = new WebClient(config.accessToken);
	}

	async testConnection(): Promise<boolean> {
		try {
			const result = await this.client.auth.test();
			return !!result.ok;
		} catch (error) {
			console.error("Slack connection test failed:", error);
			return false;
		}
	}

	async refreshToken(): Promise<string> {
		// Slack tokens don't expire, but implement refresh logic if using OAuth
		throw new Error("Slack tokens do not require refresh");
	}

	async fetchAuditData(): Promise<AuditData> {
		const [files, users, channels] = await Promise.all([
			this.fetchFiles(),
			this.fetchUsers(),
			this.fetchChannels(),
		]);

		const totalStorage = files.reduce((sum, f) => sum + f.sizeMb, 0);
		const activeUsers = users.filter(
			(u) =>
				u.lastActive &&
				u.lastActive > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
		).length;

		return {
			files,
			users,
			channels,
			storageUsedGb: Math.round((totalStorage / 1024) * 100) / 100,
			totalLicenses: users.filter((u) => !u.isGuest).length,
			activeUsers,
		};
	}

	private async fetchFiles(): Promise<FileData[]> {
		const files: FileData[] = [];
		let page = 1;
		const fileHashes = new Map<string, string[]>();

		while (true) {
			const result = await this.client.files.list({
				count: 1000,
				page,
			});

			for (const file of result.files || []) {
				const sizeMb = this.bytesToMb(file.size || 0);
				const hash = this.generateFileHash(file.name!, sizeMb);

				// Track duplicates
				if (!fileHashes.has(hash)) {
					fileHashes.set(hash, []);
				}
				fileHashes.get(hash)!.push(file.id!);

				const isDuplicate = fileHashes.get(hash)!.length > 1;

				files.push({
					name: file.name || "Untitled",
					sizeMb,
					type: this.inferFileType(file.mimetype || ""),
					source: "SLACK",
					mimeType: file.mimetype,
					fileHash: hash,
					url: file.url_private,
					path: `/${file.name}`,
					lastAccessed: file.timestamp
						? new Date(file.timestamp * 1000)
						: undefined,
					ownerEmail: file.user
						? await this.getUserEmail(file.user)
						: undefined,
					isPubliclyShared: file.public_url_shared || false,
					sharedWith: file.shares
						? this.extractSharedWith(file.shares)
						: [],
					isDuplicate,
					duplicateGroup: isDuplicate ? hash : undefined,
				});
			}

			const current = result.paging?.page ?? page;
			const total = result.paging?.pages ?? current;

			if (current >= total) break;
			page = current + 1;
		}

		return files;
	}

	private async fetchUsers(): Promise<UserData[]> {
		const users: UserData[] = [];
		let cursor: string | undefined;

		do {
			const result = await this.client.users.list({
				cursor,
				limit: 1000,
			});

			for (const user of result.members || []) {
				if (user.deleted || user.is_bot) continue;

				users.push({
					email: user.profile?.email || `${user.id}@slack.local`,
					name: user.real_name || user.name,
					role: user.is_admin
						? "admin"
						: user.is_owner
							? "owner"
							: "member",
					lastActive: user.updated
						? new Date(user.updated * 1000)
						: undefined,
					isGuest: user.is_restricted || user.is_ultra_restricted,
					licenseType: user.is_restricted ? "guest" : "full",
				});
			}

			cursor = result.response_metadata?.next_cursor;
		} while (cursor);

		return users;
	}

	private async fetchChannels(): Promise<ChannelData[]> {
		const channels: ChannelData[] = [];
		let cursor: string | undefined;

		do {
			const result = await this.client.conversations.list({
				cursor,
				limit: 1000,
				types: "public_channel,private_channel",
			});

			for (const channel of result.channels || []) {
				channels.push({
					id: channel.id!,
					name: channel.name || "Unnamed Channel",
					memberCount: channel.num_members || 0,
					lastActivity: channel.updated
						? new Date(channel.updated * 1000)
						: undefined,
					isArchived: channel.is_archived || false,
					isPrivate: channel.is_private || false,
				});
			}

			cursor = result.response_metadata?.next_cursor;
		} while (cursor);

		return channels;
	}

	private async getUserEmail(userId: string): Promise<string | undefined> {
		try {
			const result = await this.client.users.info({ user: userId });
			return result.user?.profile?.email;
		} catch {
			return undefined;
		}
	}

	private extractSharedWith(shares: any): string[] {
		const emails: string[] = [];
		// Extract user/channel IDs from shares object
		Object.values(shares).forEach((share) => {
			if (Array.isArray(share)) {
				share.forEach((s) => {
					if (s.reply_users) emails.push(...s.reply_users);
				});
			}
		});
		return [...new Set(emails)];
	}

	private generateFileHash(name: string, size: number): string {
		return crypto
			.createHash("sha256")
			.update(`${name}-${size}`)
			.digest("hex");
	}

	async identifyInactiveChannels(
		daysInactive: number = 90
	): Promise<ChannelData[]> {
		const channels = await this.fetchChannels();
		const cutoffDate = new Date(
			Date.now() - daysInactive * 24 * 60 * 60 * 1000
		);

		return channels.filter(
			(c) =>
				!c.isArchived && c.lastActivity && c.lastActivity < cutoffDate
		);
	}

	async identifyGuestUsers(): Promise<UserData[]> {
		const users = await this.fetchUsers();
		return users.filter((u) => u.isGuest);
	}
}
