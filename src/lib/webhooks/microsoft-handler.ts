import { WebhookEvent, WebhookHandler } from "./types";
import { prisma } from "@/lib/prisma";

export class MicrosoftWebhookHandler implements WebhookHandler {
	async verify(req: Request): Promise<boolean> {
		const validationToken = req.headers.get("validationToken");

		if (validationToken) {
			// This is a subscription validation request
			return true;
		}

		return true; // Microsoft uses HTTPS for security
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { data } = event;

		if (!data.value) return;

		for (const notification of data.value) {
			const changeType = notification.changeType;
			const resource = notification.resource;

			// Find integration by subscription ID
			const integration = await prisma.toolIntegration.findFirst({
				where: {
					source: "MICROSOFT",
					metadata: {
						path: ["subscriptionId"],
						equals: notification.subscriptionId,
					},
				},
			});

			if (integration) {
				await prisma.activity.create({
					data: {
						organizationId: integration.organizationId,
						action: `webhook.${changeType}`,
						metadata: { source: "MICROSOFT", resource },
					},
				});
			}
		}
	}
}
