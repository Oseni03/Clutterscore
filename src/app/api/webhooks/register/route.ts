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

			// Register webhook based on source
			let webhookRegistration;

			switch (source) {
				case "GOOGLE":
					webhookRegistration =
						await registerGoogleWebhook(integration);
					break;

				case "MICROSOFT":
					webhookRegistration =
						await registerMicrosoftWebhook(integration);
					break;

				case "DROPBOX":
					// Dropbox webhooks are app-level, no per-integration registration needed
					webhookRegistration = { success: true };
					break;

				default:
					return NextResponse.json(
						{
							error: "Webhook registration not supported for this source",
						},
						{ status: 400 }
					);
			}

			// Update integration metadata
			await prisma.toolIntegration.update({
				where: { id: integration.id },
				data: {
					metadata: {
						...(integration.metadata as object),
						webhook: webhookRegistration,
					},
				},
			});

			return NextResponse.json({
				success: true,
				message: "Webhook registered successfully",
			});
		} catch (error) {
			logger.error("Webhook registration error:", error as Error);
			return NextResponse.json(
				{ error: (error as Error).message },
				{ status: 500 }
			);
		}
	});
}

async function registerGoogleWebhook(
	integration: ToolIntegration
): Promise<any> {
	const auth = new google.auth.OAuth2();
	auth.setCredentials({
		access_token: integration.accessToken,
		refresh_token: integration.refreshToken,
	});

	const drive = google.drive({ version: "v3", auth });

	const response = await drive.files.watch({
		fileId: "root",
		requestBody: {
			id: `${integration.id}-${Date.now()}`,
			type: "web_hook",
			address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google`,
			expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // must be string!
		},
	});

	return {
		watchResourceId: response.data.resourceId,
		watchChannelId: response.data.id,
		expiration: response.data.expiration,
	};
}

async function registerMicrosoftWebhook(
	integration: ToolIntegration
): Promise<any> {
	const subscriptionData = {
		changeType: "created,updated,deleted",
		notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/microsoft`,
		resource: "/me/drive/root",
		expirationDateTime: new Date(
			Date.now() + 3 * 24 * 60 * 60 * 1000
		).toISOString(), // 3 days
		clientState: `${integration.id}-${Date.now()}`,
	};

	const response = await fetch(
		"https://graph.microsoft.com/v1.0/subscriptions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${integration.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(subscriptionData),
		}
	);

	if (!response.ok) {
		throw new Error("Failed to register Microsoft webhook");
	}

	const data = await response.json();

	return {
		subscriptionId: data.id,
		expiration: data.expirationDateTime,
		resource: data.resource,
	};
}
