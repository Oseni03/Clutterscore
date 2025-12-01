/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToolSource, FileType } from "@prisma/client";

export interface ConnectorConfig {
	accessToken: string;
	refreshToken?: string;
	organizationId: string;
	expiresAt?: Date;
	metadata?: Record<string, any>;
}

export interface FileData {
	name: string;
	sizeMb: number;
	type: FileType;
	externalId: string;
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
	metadata?: Record<string, any>;
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
	metadata?: Record<string, any>;
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

	// ============================================================================
	// ABSTRACT METHODS - Must be implemented by all connectors
	// ============================================================================

	abstract fetchAuditData(): Promise<AuditData>;
	abstract testConnection(): Promise<boolean>;
	abstract refreshToken(): Promise<string>;

	// ============================================================================
	// OPTIONAL EXECUTION METHODS - Override as needed per connector
	// ============================================================================

	/**
	 * Delete a file from the service.
	 * @param externalId File ID in the external service
	 * @param metadata Additional file metadata (path, name, etc.)
	 */
	async deleteFile(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`File deletion is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Update permissions on a file (typically restricting access).
	 * @param externalId File ID in the external service
	 * @param metadata File metadata including current sharing info
	 */
	async updatePermissions(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`Permission updates are not supported for ${this.source}. Please manage permissions directly in the service.`
		);
	}

	/**
	 * Archive a channel or workspace.
	 * @param externalId Channel/workspace ID
	 * @param metadata Channel metadata (name, member count, etc.)
	 */
	async archiveChannel(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`Channel archival is not supported for ${this.source}. Please archive channels directly in the service.`
		);
	}

	/**
	 * Remove a guest user from the workspace.
	 * @param externalId Guest user email or ID
	 * @param metadata User metadata (name, role, etc.)
	 */
	async removeGuest(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`Guest removal is not supported for ${this.source}. Please remove guests directly in the service.`
		);
	}

	/**
	 * Disable or suspend a user account.
	 * @param externalId User email or ID
	 * @param metadata User metadata (name, role, last active, etc.)
	 */
	async disableUser(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`User deactivation is not supported for ${this.source}. Please disable users directly in the service.`
		);
	}

	/**
	 * Revoke a specific access token or session.
	 * @param externalId Token ID or session ID
	 * @param metadata Token metadata (scopes, created date, etc.)
	 */
	async revokeAccess(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`Access revocation is not supported for ${this.source}. Please revoke access directly in the service settings.`
		);
	}

	/**
	 * Remove a license from a user.
	 * @param externalId User email or ID
	 * @param metadata License metadata (type, cost, etc.)
	 */
	async removeLicense(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`License removal is not supported for ${this.source}. Please manage licenses directly in the service.`
		);
	}

	// ============================================================================
	// HELPER METHODS - Available to all connectors
	// ============================================================================

	protected async handleApiError(error: any): Promise<ConnectorError> {
		const statusCode =
			error.status || error.statusCode || error.response?.status;
		const isRetryable = statusCode >= 500 || statusCode === 429;

		return {
			code: error.code || `HTTP_${statusCode}` || "UNKNOWN_ERROR",
			message:
				error.message ||
				error.response?.data?.message ||
				"An unknown error occurred",
			retryable: isRetryable,
		};
	}

	protected inferFileType(mimeType: string): FileType {
		const mime = mimeType.toLowerCase();

		if (mime.startsWith("image/")) return "IMAGE";
		if (mime.startsWith("video/")) return "VIDEO";
		if (mime.startsWith("audio/")) return "MUSIC";
		if (
			mime.includes("pdf") ||
			mime.includes("document") ||
			mime.includes("text") ||
			mime.includes("spreadsheet") ||
			mime.includes("presentation") ||
			mime.includes("word") ||
			mime.includes("excel") ||
			mime.includes("powerpoint")
		) {
			return "DOCUMENT";
		}
		if (
			mime.includes("zip") ||
			mime.includes("rar") ||
			mime.includes("tar") ||
			mime.includes("7z") ||
			mime.includes("gz") ||
			mime.includes("bz2")
		) {
			return "ARCHIVE";
		}
		if (
			mime.includes("database") ||
			mime.includes("sql") ||
			mime.includes("db")
		) {
			return "DATABASE";
		}

		return "OTHER";
	}

	protected bytesToMb(bytes: number): number {
		if (bytes === 0) return 0;
		return Math.round((bytes / (1024 * 1024)) * 100) / 100;
	}

	protected mbToGb(mb: number): number {
		if (mb === 0) return 0;
		return Math.round((mb / 1024) * 100) / 100;
	}

	/**
	 * Check if the access token is expired or about to expire
	 */
	protected isTokenExpired(): boolean {
		if (!this.config.expiresAt) return false;
		const expiryBuffer = 5 * 60 * 1000; // 5 minutes
		return this.config.expiresAt.getTime() - Date.now() < expiryBuffer;
	}

	/**
	 * Automatically refresh token if needed before making API calls
	 */
	protected async ensureValidToken(): Promise<void> {
		if (this.isTokenExpired() && this.config.refreshToken) {
			const newToken = await this.refreshToken();
			this.config.accessToken = newToken;
		}
	}
}
