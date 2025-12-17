/* eslint-disable @typescript-eslint/no-explicit-any */
import { put, del, head } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { ToolSource } from "@prisma/client";
import { logger } from "@/lib/logger";
import slugify from "@sindresorhus/slugify";
import { inngest } from "@/inngest/client";

export interface ArchiveFileOptions {
	organizationId: string;
	source: ToolSource;
	externalId: string;
	fileName: string;
	fileUrl: string;
	sizeMb: number;
	mimeType?: string;
	metadata: Record<string, any>;
	archivedBy?: string;
}

export interface RestoreFileOptions {
	archiveId: string;
	targetLocation?: string; // Platform-specific (e.g., Slack channel ID)
}

export class ArchiveService {
	private readonly TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
	private readonly RETENTION_DAYS = 30;

	/**
	 * Archive a file by downloading and storing in Vercel Blob
	 */
	async archiveFile(options: ArchiveFileOptions): Promise<string> {
		const {
			organizationId,
			source,
			externalId,
			fileName,
			fileUrl,
			sizeMb,
			mimeType,
			metadata,
			archivedBy,
		} = options;

		try {
			logger.info(
				`Starting archive for file: ${fileName} (${externalId})`
			);

			// 1. Download file from platform
			const fileBuffer = await this.downloadFile(
				fileUrl,
				metadata.headers
			);

			// 2. Generate unique storage path
			const storageKey = this.generateStorageKey(
				organizationId,
				source,
				externalId,
				fileName
			);

			// 3. Upload to Vercel Blob
			const blob = await put(storageKey, fileBuffer, {
				access: "public",
				token: this.TOKEN,
				contentType: mimeType || "application/octet-stream",
				addRandomSuffix: false,
			});

			logger.info(`Uploaded to Vercel Blob: ${blob.url}`);

			// 4. Save metadata to database
			const archivedFile = await prisma.archivedFile.create({
				data: {
					organizationId,
					source,
					externalId,
					name: fileName,
					sizeMb,
					mimeType: mimeType || null,
					storageProvider: "VERCEL_BLOB",
					storageBucket: "default",
					storageKey,
					downloadUrl: blob.url,
					archivedBy: archivedBy || "system",
					expiresAt: new Date(
						Date.now() + this.RETENTION_DAYS * 24 * 60 * 60 * 1000
					),
					status: "ARCHIVED",
					originalLocation: metadata.originalLocation || {},
					metadata: {
						...metadata,
						blobUrl: blob.url,
						uploadedAt: new Date().toISOString(),
						size: fileBuffer.byteLength,
					},
				},
			});

			// 🎯 NEW: Send Inngest event
			await inngest.send({
				name: "archive/file.created",
				data: {
					archiveId: archivedFile.id,
					organizationId,
					fileName,
					source,
					expiresAt: archivedFile.expiresAt.toISOString(),
				},
			});

			logger.info(
				`Archived file and sent Inngest event: ${archivedFile.id}`
			);

			return archivedFile.id;
		} catch (error) {
			logger.error("Archive failed:", error);
			throw new Error(
				`Failed to archive file: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Restore a file from Vercel Blob back to the platform
	 */
	async restoreFile(
		options: RestoreFileOptions,
		uploadCallback: (buffer: Buffer, metadata: any) => Promise<any>
	): Promise<any> {
		const { archiveId, targetLocation } = options;

		try {
			// 1. Get archived file from database
			const archivedFile = await prisma.archivedFile.findUnique({
				where: { id: archiveId },
			});

			if (!archivedFile) {
				throw new Error("Archived file not found");
			}

			if (archivedFile.status === "DELETED") {
				throw new Error("File has been permanently deleted");
			}

			logger.info(`Restoring file: ${archivedFile.name} (${archiveId})`);

			// 2. Download from Vercel Blob
			const response = await fetch(archivedFile.downloadUrl!);

			if (!response.ok) {
				throw new Error(
					`Failed to download from blob: ${response.statusText}`
				);
			}

			const arrayBuffer = await response.arrayBuffer();
			const fileBuffer = Buffer.from(arrayBuffer);

			logger.info(
				`Downloaded ${fileBuffer.byteLength} bytes from Vercel Blob`
			);

			// 3. Upload to platform using callback
			const uploadResult = await uploadCallback(fileBuffer, {
				fileName: archivedFile.name,
				mimeType: archivedFile.mimeType,
				targetLocation,
				originalLocation: archivedFile.originalLocation,
				metadata: archivedFile.metadata,
			});

			// 4. Update database
			await prisma.archivedFile.update({
				where: { id: archiveId },
				data: {
					status: "RESTORED",
					metadata: {
						...(archivedFile.metadata as object),
						restoredAt: new Date().toISOString(),
						restoredTo: targetLocation,
						newExternalId: uploadResult.fileId || uploadResult.id,
					},
				},
			});

			// 🎯 NEW: Send Inngest event
			await inngest.send({
				name: "archive/file.restored",
				data: {
					archiveId,
					organizationId: archivedFile.organizationId,
					fileName: archivedFile.name,
					source: archivedFile.source,
				},
			});

			logger.info(
				`Restored file and sent Inngest event: ${archivedFile.name}`
			);

			return uploadResult;
		} catch (error) {
			logger.error("Restore failed:", error);
			throw new Error(
				`Failed to restore file: ${(error as Error).message}`
			);
		}
	}

	/**
	 * Clean up a single expired archive
	 * Used by Inngest cleanup function
	 */
	async cleanupSingleArchive(archiveId: string): Promise<void> {
		const archivedFile = await prisma.archivedFile.findUnique({
			where: { id: archiveId },
		});

		if (!archivedFile) {
			throw new Error("Archived file not found");
		}

		// Delete from Vercel Blob
		await del(archivedFile.downloadUrl!, { token: this.TOKEN });

		// Update database
		await prisma.archivedFile.update({
			where: { id: archiveId },
			data: { status: "DELETED" },
		});

		logger.info(`Permanently deleted archived file: ${archivedFile.name}`);
	}

	/**
	 * Get a temporary download URL for viewing archived files
	 */
	async getDownloadUrl(archiveId: string): Promise<string> {
		const archivedFile = await prisma.archivedFile.findUnique({
			where: { id: archiveId },
		});

		if (!archivedFile) {
			throw new Error("Archived file not found");
		}

		if (archivedFile.status === "DELETED") {
			throw new Error("File has been permanently deleted");
		}

		// Vercel Blob URLs are already public and long-lived
		return archivedFile.downloadUrl!;
	}

	/**
	 * Check if a file exists in the archive
	 */
	async fileExists(archiveId: string): Promise<boolean> {
		try {
			const archivedFile = await prisma.archivedFile.findUnique({
				where: { id: archiveId },
			});

			if (!archivedFile || archivedFile.status === "DELETED") {
				return false;
			}

			// Verify blob exists
			const blobInfo = await head(archivedFile.downloadUrl!, {
				token: this.TOKEN,
			});

			return !!blobInfo;
		} catch (error) {
			logger.error("FILE_EXISTS_ERROR: ", error);
			return false;
		}
	}

	/**
	 * @deprecated Use Inngest scheduled function instead
	 * Kept for backwards compatibility
	 */
	async cleanupExpiredArchives(): Promise<{
		deleted: number;
		failed: number;
	}> {
		logger.warn(
			"Direct cleanup call detected. Consider using Inngest scheduled function instead."
		);

		const expiredFiles = await prisma.archivedFile.findMany({
			where: {
				expiresAt: { lt: new Date() },
				status: "ARCHIVED",
			},
		});

		let deleted = 0;
		let failed = 0;

		for (const file of expiredFiles) {
			try {
				await this.cleanupSingleArchive(file.id);
				deleted++;
			} catch (error) {
				failed++;
				logger.error(
					`Failed to delete archived file ${file.id}:`,
					error
				);
			}
		}

		return { deleted, failed };
	}

	/**
	 * Get archive statistics for an organization
	 */
	async getArchiveStats(organizationId: string): Promise<{
		totalFiles: number;
		totalSizeMb: number;
		bySource: Record<string, number>;
		expiringSoon: number; // Files expiring in next 7 days
	}> {
		const files = await prisma.archivedFile.findMany({
			where: {
				organizationId,
				status: "ARCHIVED",
			},
		});

		const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

		const stats = {
			totalFiles: files.length,
			totalSizeMb: files.reduce((sum, f) => sum + f.sizeMb, 0),
			bySource: {} as Record<string, number>,
			expiringSoon: files.filter((f) => f.expiresAt <= sevenDaysFromNow)
				.length,
		};

		files.forEach((f) => {
			stats.bySource[f.source] = (stats.bySource[f.source] || 0) + 1;
		});

		return stats;
	}

	// ============================================================================
	// PRIVATE HELPERS
	// ============================================================================

	private async downloadFile(
		url: string,
		headers?: Record<string, string>
	): Promise<Buffer> {
		const response = await fetch(url, { headers });

		if (!response.ok) {
			throw new Error(`Download failed: ${response.statusText}`);
		}

		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	private generateStorageKey(
		orgId: string,
		source: ToolSource,
		fileId: string,
		fileName: string
	): string {
		// Format: org-id/source/file-id/filename
		// Example: abc-123/SLACK/F123456/document.pdf
		const sanitizedFileName = slugify(fileName);
		return `${orgId}/${source}/${fileId}/${sanitizedFileName}`;
	}
}
