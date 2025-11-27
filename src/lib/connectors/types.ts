/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolSource, FileType } from "@prisma/client";

export interface ConnectorConfig {
	accessToken: string;
	refreshToken?: string;
	organizationId: string;
}

export interface FileData {
	name: string;
	sizeMb: number;
	type: FileType;
	source: ToolSource;
	mimeType?: string;
	fileHash?: string;
	url?: string;
	path?: string;
	lastAccessed?: Date;
	ownerEmail?: string;
	isPubliclyShared: boolean;
	sharedWith: string[];
	isDuplicate: boolean;
	duplicateGroup?: string;
}

export interface UserData {
	email: string;
	name?: string;
	role?: string;
	lastActive?: Date;
	isGuest?: boolean;
	licenseType?: string;
}

export interface ChannelData {
	id: string;
	name: string;
	memberCount: number;
	lastActivity?: Date;
	isArchived: boolean;
	isPrivate: boolean;
}

export interface PlaybookItemData {
	itemName: string;
	itemType: string;
	externalId?: string;
	metadata: Record<string, any>;
}

export interface AuditData {
	files: FileData[];
	users: UserData[];
	channels?: ChannelData[];
	storageUsedGb: number;
	totalLicenses: number;
	activeUsers: number;
}

export interface ConnectorError {
	code: string;
	message: string;
	retryable: boolean;
}

export abstract class BaseConnector {
	protected config: ConnectorConfig;
	protected source: ToolSource;

	constructor(config: ConnectorConfig, source: ToolSource) {
		this.config = config;
		this.source = source;
	}

	abstract fetchAuditData(): Promise<AuditData>;
	abstract testConnection(): Promise<boolean>;
	abstract refreshToken(): Promise<string>;

	protected async handleApiError(error: any): Promise<ConnectorError> {
		// Common error handling logic
		return {
			code: error.code || "UNKNOWN_ERROR",
			message: error.message || "An unknown error occurred",
			retryable: error.status >= 500 || error.code === "RATE_LIMIT",
		};
	}

	protected inferFileType(mimeType: string): FileType {
		if (mimeType.startsWith("image/")) return "IMAGE";
		if (mimeType.startsWith("video/")) return "VIDEO";
		if (mimeType.startsWith("audio/")) return "MUSIC";
		if (
			mimeType.includes("pdf") ||
			mimeType.includes("document") ||
			mimeType.includes("text") ||
			mimeType.includes("spreadsheet") ||
			mimeType.includes("presentation")
		)
			return "DOCUMENT";
		if (
			mimeType.includes("zip") ||
			mimeType.includes("rar") ||
			mimeType.includes("tar") ||
			mimeType.includes("7z")
		)
			return "ARCHIVE";
		if (mimeType.includes("database") || mimeType.includes("sql"))
			return "DATABASE";
		return "OTHER";
	}

	protected bytesToMb(bytes: number): number {
		return Math.round((bytes / (1024 * 1024)) * 100) / 100;
	}
}
