import crypto from "crypto";
import { WebhookEvent, WebhookHandler } from "./types";
import { prisma } from "@/lib/prisma";

export class DropboxWebhookHandler implements WebhookHandler {
	async verify(req: Request): Promise<boolean> {
		const signature = req.headers.get("x-dropbox-signature");

		if (!signature) {
			return false;
		}

		const body = await req.text();
		const expectedSignature = crypto
			.createHmac("sha256", process.env.DROPBOX_APP_SECRET!)
			.update(body)
			.digest("hex");

		return crypto.timingSafeEqual(
			Buffer.from(signature),
			Buffer.from(expectedSignature)
		);
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { data } = event;

		// Dropbox webhooks only notify that changes occurred
		// We need to query the API to get actual changes
		for (const account of data.list_folder?.accounts || []) {
			const integration = await prisma.toolIntegration.findFirst({
				where: {
					source: "DROPBOX",
					metadata: {
						path: ["accountId"],
						equals: account,
					},
				},
			});

			if (integration) {
				await prisma.activity.create({
					data: {
						organizationId: integration.organizationId,
						action: "webhook.files_changed",
						metadata: { source: "DROPBOX", account },
					},
				});
			}
		}
	}
}
