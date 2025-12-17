/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/middleware";
import { ConnectorFactory } from "@/lib/connectors/factory";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	return withAuth(req, async (req, user) => {
		try {
			const { id } = await params;

			// Get archived file
			const archivedFile = await prisma.archivedFile.findUnique({
				where: { id, organizationId: user.organizationId },
			});

			if (!archivedFile) {
				return NextResponse.json(
					{ error: "Archived file not found" },
					{ status: 404 }
				);
			}

			// Get integration
			const integration = await prisma.toolIntegration.findUnique({
				where: {
					organizationId_source: {
						organizationId: user.organizationId,
						source: archivedFile.source,
					},
				},
			});

			if (!integration) {
				return NextResponse.json(
					{ error: `Integration ${archivedFile.source} not found` },
					{ status: 404 }
				);
			}

			// Create connector
			const connector = ConnectorFactory.create(archivedFile.source, {
				accessToken: integration.accessToken,
				refreshToken: integration.refreshToken || undefined,
				organizationId: user.organizationId,
				metadata: integration.metadata as Record<string, any>,
			});

			// Restore file via connector
			await connector.restoreFile({
				type: "restore_file",
				fileId: archivedFile.externalId,
				fileName: archivedFile.name,
				originalPath: "",
				source: archivedFile.source,
				itemId: id,
				itemName: archivedFile.name,
				itemType: "file",
				externalId: archivedFile.externalId,
				actionType: "ARCHIVE_FILE",
				originalMetadata: archivedFile.metadata as Record<string, any>,
				executedAt: archivedFile.archivedAt,
			});

			return NextResponse.json({
				success: true,
				message: `File restored to ${archivedFile.source}`,
			});
		} catch (error) {
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}
