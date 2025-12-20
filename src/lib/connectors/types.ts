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

export interface UndoAction {
	type:
		| "restore_file"
		| "restore_access"
		| "restore_permissions"
		| "restore_channel"
		| "restore_user"
		| "restore_license";
	itemId: string;
	itemName: string;
	itemType: string;
	externalId: string | null;
	actionType: string;
	originalMetadata: Record<string, any>;
	executedAt: Date;
	executedBy?: string;
}

export interface RestoreFileAction extends UndoAction {
	type: "restore_file";
	fileId: string;
	fileName: string;
	originalPath: string;
	originalParentId?: string;
	archiveFolderId?: string;
	source: string;
}

export interface RestoreAccessAction extends UndoAction {
	type: "restore_access";
	userId: string;
	userEmail: string;
	groupId?: string;
	role?: string;
	permissions?: string[];
}

export interface RestorePermissionsAction extends UndoAction {
	type: "restore_permissions";
	fileId: string;
	fileName: string;
	originalSharing: {
		isPubliclyShared: boolean;
		sharedWith: string[];
		permissions?: any[];
	};
}

export interface RestoreChannelAction extends UndoAction {
	type: "restore_channel";
	channelId: string;
	channelName: string;
	isPrivate: boolean;
	memberCount: number;
}

export interface RestoreUserAction extends UndoAction {
	type: "restore_user";
	userId: string;
	userEmail: string;
	role: string;
	licenseType?: string;
}

export interface RestoreLicenseAction extends UndoAction {
	type: "restore_license";
	userId: string;
	userEmail: string;
	licenseType: string;
	sku?: string;
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

	/**
	 * NEW: Fetch the total user/license count from the integration
	 * This is used to determine the appropriate subscription tier
	 */
	abstract fetchUserCount(): Promise<number>;

	// ============================================================================
	// EXECUTION METHODS - Override as needed per connector
	// ============================================================================

	/**
	 * Archive a file (safer than permanent deletion)
	 * Implementations should move files to an archive folder or mark them as archived
	 *
	 * @param externalId File ID in the external service
	 * @param metadata Additional file metadata (path, name, etc.)
	 */
	async archiveFile(
		_externalId: string,
		_metadata: Record<string, any>
	): Promise<void> {
		void _externalId;
		void _metadata;
		throw new Error(
			`File archival is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Delete a file permanently (DEPRECATED - use archiveFile instead)
	 * This method is kept for backwards compatibility but should call archiveFile
	 *
	 * @param externalId File ID in the external service
	 * @param metadata Additional file metadata
	 */
	async deleteFile(
		externalId: string,
		metadata: Record<string, any>
	): Promise<void> {
		// Default implementation calls archiveFile for safety
		return this.archiveFile(externalId, metadata);
	}

	/**
	 * Update permissions on a file (typically restricting access)
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
	 * Archive a channel or workspace
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
	 * Remove a guest user from the workspace
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
	 * Disable or suspend a user account
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
	 * Revoke a specific access token or session
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
	 * Remove a license from a user
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
	// UNDO METHODS - Restore previously executed actions
	// ============================================================================

	/**
	 * Restore a file from archive back to its original location
	 * @param undoAction Action metadata containing restore information
	 */
	async restoreFile(_undoAction: RestoreFileAction): Promise<void> {
		void _undoAction;
		throw new Error(
			`File restoration is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Restore user access that was previously revoked
	 * @param undoAction Action metadata containing restore information
	 */
	async restoreAccess(_undoAction: RestoreAccessAction): Promise<void> {
		void _undoAction;
		throw new Error(
			`Access restoration is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Restore file permissions to their original state
	 * @param undoAction Action metadata containing restore information
	 */
	async restorePermissions(
		_undoAction: RestorePermissionsAction
	): Promise<void> {
		void _undoAction;
		throw new Error(
			`Permission restoration is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Unarchive a channel or workspace
	 * @param undoAction Action metadata containing restore information
	 */
	async restoreChannel(_undoAction: RestoreChannelAction): Promise<void> {
		void _undoAction;
		throw new Error(
			`Channel restoration is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Re-enable a previously disabled user account
	 * @param undoAction Action metadata containing restore information
	 */
	async restoreUser(_undoAction: RestoreUserAction): Promise<void> {
		void _undoAction;
		throw new Error(
			`User restoration is not supported for ${this.source}. Please contact support if you need this feature.`
		);
	}

	/**
	 * Re-assign a license to a user
	 * @param undoAction Action metadata containing restore information
	 */
	async restoreLicense(_undoAction: RestoreLicenseAction): Promise<void> {
		void _undoAction;
		throw new Error(
			`License restoration is not supported for ${this.source}. Please contact support if you need this feature.`
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
