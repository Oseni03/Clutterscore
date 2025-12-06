import { withAuth } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ConnectorFactory } from "@/lib/connectors/factory";
import { ConnectorConfig } from "@/lib/connectors/types";

/**
 * DELETE /api/files/[id]
 * Delete a file from both the external platform and local database
 */
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;

	return withAuth(req, async (req, user) => {
		try {
			// 1. Find file and verify ownership
			const file = await prisma.file.findFirst({
				where: {
					id,
					auditResult: {
						organizationId: user.organizationId,
					},
				},
				include: {
					auditResult: {
						select: {
							organizationId: true,
						},
					},
				},
			});

			if (!file) {
				return NextResponse.json(
					{ error: "File not found or access denied" },
					{ status: 404 }
				);
			}

			// Prevent deleting already deleted files
			if (file.status === "DELETED") {
				return NextResponse.json(
					{ error: "File is already deleted" },
					{ status: 400 }
				);
			}

			// 2. Find integration for external deletion
			const integration = await prisma.toolIntegration.findUnique({
				where: {
					organizationId_source: {
						organizationId: user.organizationId,
						source: file.source,
					},
				},
			});

			if (!integration) {
				return NextResponse.json(
					{
						error: `Integration not found for ${file.source}. Cannot delete file from external platform.`,
					},
					{ status: 404 }
				);
			}

			if (!integration.isActive) {
				return NextResponse.json(
					{
						error: `${file.source} integration is inactive. Please reconnect to delete files.`,
					},
					{ status: 400 }
				);
			}

			// 3. Attempt external deletion
			let externalDeletionSuccess = false;
			let externalError: string | null = null;
			let updatedAccessToken: string | undefined;
			let updatedExpiresAt: Date | undefined;

			try {
				const connectorConfig: ConnectorConfig = {
					accessToken: integration.accessToken,
					refreshToken: integration.refreshToken || undefined,
					organizationId: user.organizationId,
					expiresAt: integration.expiresAt || undefined,
					metadata:
						(integration.metadata as Record<string, unknown>) || {},
				};

				const connector = ConnectorFactory.create(
					file.source,
					connectorConfig
				);

				// Check if externalId exists (required for deletion)
				if (!file.externalId) {
					throw new Error(
						"File missing external ID. Cannot delete from platform."
					);
				}

				// Prepare file metadata for deletion
				const fileMetadata: Record<string, unknown> = {
					name: file.name,
					path: file.path || undefined,
					mimeType: file.mimeType || undefined,
					url: file.url || undefined,
				};

				// Attempt deletion on external platform
				await connector.deleteFile(file.externalId, fileMetadata);
				externalDeletionSuccess = true;

				// Store updated tokens if refreshed
				if (connectorConfig.accessToken !== integration.accessToken) {
					updatedAccessToken = connectorConfig.accessToken;
					updatedExpiresAt = connectorConfig.expiresAt;
				}
			} catch (error) {
				console.error(
					`Failed to delete file from ${file.source}:`,
					error
				);
				externalError =
					error instanceof Error ? error.message : "Unknown error";

				// If connector doesn't support deletion, warn but don't fail
				const isNotSupported = externalError
					.toLowerCase()
					.includes("not implemented");

				if (!isNotSupported) {
					// For real errors (not "not implemented"), fail the request
					await logFailedDeletion(
						user.organizationId,
						user.id,
						user.email,
						file,
						externalError
					);

					return NextResponse.json(
						{
							error: `Failed to delete file from ${file.source}: ${externalError}`,
						},
						{ status: 500 }
					);
				}

				console.warn(
					`File deletion not supported for ${file.source}, proceeding with local soft delete only`
				);
			}

			// 4. Update integration tokens if refreshed
			if (updatedAccessToken && integration) {
				await prisma.toolIntegration.update({
					where: { id: integration.id },
					data: {
						accessToken: updatedAccessToken,
						expiresAt: updatedExpiresAt,
					},
				});
			}

			// 5. Soft delete in local database
			await prisma.file.update({
				where: { id },
				data: {
					status: "DELETED",
					updatedAt: new Date(),
				},
			});

			// 6. Log activity and audit trail
			await Promise.all([
				// Activity log
				prisma.activity.create({
					data: {
						organizationId: user.organizationId,
						userId: user.id,
						action: "file.deleted",
						metadata: {
							fileId: file.id,
							fileName: file.name,
							source: file.source,
							sizeMb: file.sizeMb,
							path: file.path,
							externalDeletionSuccess,
							externalError,
						},
					},
				}),

				// Audit log
				prisma.auditLog.create({
					data: {
						organizationId: user.organizationId,
						userId: user.id,
						actionType: "DELETE_FILE",
						target: file.name,
						targetType: "File",
						executor: `${user.name || user.email}`,
						status: "SUCCESS",
						details: {
							fileId: file.id,
							source: file.source,
							sizeMb: file.sizeMb,
							path: file.path,
							externalDeletionSuccess,
							externalError: externalError || undefined,
						},
						// Enable undo for 30 days
						undoActions: externalDeletionSuccess
							? []
							: [
									{
										action: "restore",
										fileId: file.id,
										externalId: file.externalId,
									},
								],
						undoExpiresAt: new Date(
							Date.now() + 30 * 24 * 60 * 60 * 1000
						), // 30 days
					},
				}),
			]);

			// 7. Return success response
			const message = externalDeletionSuccess
				? `File "${file.name}" deleted successfully from ${file.source} and database`
				: externalError?.toLowerCase().includes("not implemented")
					? `File "${file.name}" marked as deleted (${file.source} does not support automatic deletion)`
					: `File "${file.name}" marked as deleted locally, but external deletion failed`;

			return NextResponse.json({
				success: true,
				message,
				file: {
					id: file.id,
					name: file.name,
					source: file.source,
					status: "DELETED",
				},
				externalDeletionSuccess,
				externalError: externalError || undefined,
			});
		} catch (error) {
			console.error("Failed to delete file:", error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			// Log failed attempt
			await logFailedDeletion(
				user.organizationId,
				user.id,
				user.email,
				null,
				errorMessage
			).catch((logError) => {
				console.error("Failed to create audit log:", logError);
			});

			return NextResponse.json(
				{
					error: errorMessage || "Failed to delete file",
				},
				{ status: 500 }
			);
		}
	});
}

/**
 * Helper: Log failed deletion attempt
 */
async function logFailedDeletion(
	organizationId: string,
	userId: string,
	userEmail: string,
	file: { id: string; name: string; source: string } | null,
	error: string
) {
	try {
		await prisma.auditLog.create({
			data: {
				organizationId,
				userId,
				actionType: "DELETE_FILE",
				target: file?.name || "Unknown file",
				targetType: "File",
				executor: userEmail,
				status: "FAILED",
				details: {
					fileId: file?.id,
					source: file?.source,
					error,
				},
			},
		});
	} catch (logError) {
		console.error("Failed to log failed deletion:", logError);
	}
}
