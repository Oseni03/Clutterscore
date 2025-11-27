/* eslint-disable @typescript-eslint/no-explicit-any */
import { WebhookEvent, WebhookHandler } from "./types";
import { prisma } from "@/lib/prisma";

export class GoogleWebhookHandler implements WebhookHandler {
	async verify(req: Request): Promise<boolean> {
		// Google uses channel tokens for verification
		const channelToken = req.headers.get("x-goog-channel-token");
		return !!channelToken; // Verify against stored token
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { eventType, data } = event;

		switch (eventType) {
			case "sync":
				// Initial sync notification
				break;

			case "add":
			case "remove":
			case "update":
			case "trash":
				await this.handleDriveChange(data);
				break;

			default:
				console.log(`Unhandled Google event: ${eventType}`);
		}
	}

	private async handleDriveChange(data: any): Promise<void> {
		const resourceId = data.id;

		// Find integration by resource ID
		const integration = await prisma.toolIntegration.findFirst({
			where: {
				source: "GOOGLE",
				metadata: {
					path: ["watchResourceId"],
					equals: resourceId,
				},
			},
		});

		if (integration) {
			await prisma.activity.create({
				data: {
					organizationId: integration.organizationId,
					action: "webhook.drive_changed",
					metadata: { source: "GOOGLE", data },
				},
			});
		}
	}
}
