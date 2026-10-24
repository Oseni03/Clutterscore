import { ToolIntegration } from "@prisma/client";
import { google } from "googleapis";

export async function unregisterIntegrationWebhook(
	integration: ToolIntegration
): Promise<void> {
	const metadata = (integration.metadata ?? {}) as Record<string, unknown>;
	const webhook = metadata.webhook as Record<string, unknown> | undefined;

	switch (integration.source) {
		case "GOOGLE": {
			if (!webhook?.watchChannelId || !webhook?.watchResourceId) {
				return;
			}

			const auth = new google.auth.OAuth2();
			auth.setCredentials({
				access_token: integration.accessToken,
				refresh_token: integration.refreshToken,
			});

			const drive = google.drive({ version: "v3", auth });
			try {
				await drive.channels.stop({
					requestBody: {
						id: String(webhook.watchChannelId),
						resourceId: String(webhook.watchResourceId),
					},
				});
			} catch (error) {
				if ((error as { code?: number }).code !== 404) {
					throw error;
				}
			}
			break;
		}

		case "MICROSOFT": {
			if (!webhook?.subscriptionId) return;

			const response = await fetch(
				`https://graph.microsoft.com/v1.0/subscriptions/${String(webhook.subscriptionId)}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${integration.accessToken}`,
					},
				}
			);

			if (!response.ok && response.status !== 404) {
				throw new Error("Failed to unregister Microsoft webhook");
			}
			break;
		}

		default:
			break;
	}
}
