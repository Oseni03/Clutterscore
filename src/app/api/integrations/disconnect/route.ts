/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ToolIntegration, ToolSource } from "@prisma/client";
import { withAuth } from "@/lib/middleware";
import { google } from "googleapis";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
	return withAuth(req, async (req, user) => {
		try {
			const { source } = await req.json();

			if (!source || !Object.values(ToolSource).includes(source)) {
				return NextResponse.json(
					{ error: "Invalid source" },
					{ status: 400 }
				);
			}

			const integration = await prisma.toolIntegration.findUnique({
				where: {
					organizationId_source: {
						organizationId: user.organizationId,
						source,
					},
				},
			});

			if (!integration) {
				return NextResponse.json(
					{ error: "Integration not found" },
					{ status: 404 }
				);
			}

			// Unregister webhooks if applicable
			try {
				await unregisterWebhook(integration);
			} catch (error) {
				logger.error("Failed to unregister webhook:", error as Error);
			}

			// Soft delete by setting isActive to false
			await prisma.toolIntegration.update({
				where: { id: integration.id },
				data: {
					isActive: false,
					// Optionally clear tokens
					// accessToken: "",
					// refreshToken: null,
				},
			});

			// Log activity
			await prisma.activity.create({
				data: {
					organizationId: user.organizationId,
					userId: user.id,
					action: "integration.removed",
					metadata: { source },
				},
			});

			return NextResponse.json({
				success: true,
				message: `${source} disconnected successfully`,
			});
		} catch (error) {
			logger.error("Disconnect error:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}

async function unregisterWebhook(integration: ToolIntegration): Promise<void> {
	const { source, metadata } = integration;

	switch (source) {
		case "GOOGLE":
			if ((metadata as Record<string, any>)?.webhook?.watchChannelId) {
				const auth = new google.auth.OAuth2();
				auth.setCredentials({
					access_token: integration.accessToken,
					refresh_token: integration.refreshToken,
				});

				const drive = google.drive({ version: "v3", auth });
				await drive.channels.stop({
					requestBody: {
						id: (metadata as Record<string, any>).webhook
							.watchChannelId,
						resourceId: (metadata as Record<string, any>).webhook
							.watchResourceId,
					},
				});
			}
			break;

		case "MICROSOFT":
			if ((metadata as Record<string, any>)?.webhook?.subscriptionId) {
				await fetch(
					`https://graph.microsoft.com/v1.0/subscriptions/${(metadata as Record<string, any>).webhook.subscriptionId}`,
					{
						method: "DELETE",
						headers: {
							Authorization: `Bearer ${integration.accessToken}`,
						},
					}
				);
			}
			break;

		default:
			// No webhook to unregister
			break;
	}
}
