/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { WebhookEvent, WebhookHandler } from "./types";
import { logger } from "../logger";

export class SlackWebhookHandler implements WebhookHandler {
	private signingSecret: string;

	constructor() {
		this.signingSecret = process.env.SLACK_SIGNING_SECRET!;
	}

	async verify(req: Request): Promise<boolean> {
		const signature = req.headers.get("x-slack-signature");
		const timestamp = req.headers.get("x-slack-request-timestamp");

		if (!signature || !timestamp) {
			return false;
		}

		// Prevent replay attacks (request must be within 5 minutes)
		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - parseInt(timestamp)) > 60 * 5) {
			return false;
		}

		const body = await req.text();
		const sigBasestring = `v0:${timestamp}:${body}`;

		const mySignature =
			"v0=" +
			crypto
				.createHmac("sha256", this.signingSecret)
				.update(sigBasestring)
				.digest("hex");

		return crypto.timingSafeEqual(
			Buffer.from(mySignature),
			Buffer.from(signature)
		);
	}

	async handle(event: WebhookEvent): Promise<void> {
		const { eventType, data } = event;

		switch (eventType) {
			case "file_created":
			case "file_deleted":
			case "file_shared":
				await this.handleFileEvent(data);
				break;

			case "channel_created":
			case "channel_deleted":
			case "channel_archive":
				await this.handleChannelEvent(data);
				break;

			case "user_change":
			case "team_join":
				await this.handleUserEvent(data);
				break;

			default:
				logger.warn(`Unhandled Slack event: ${eventType}`);
		}
	}

	private async handleFileEvent(data: any): Promise<void> {
		// Trigger incremental sync for files
		await this.triggerIncrementalSync("file", data);
	}

	private async handleChannelEvent(data: any): Promise<void> {
		// Trigger incremental sync for channels
		await this.triggerIncrementalSync("channel", data);
	}

	private async handleUserEvent(data: any): Promise<void> {
		// Trigger incremental sync for users
		await this.triggerIncrementalSync("user", data);
	}

	private async triggerIncrementalSync(
		type: string,
		data: any
	): Promise<void> {
		// Find all organizations with Slack integration
		const integrations = await prisma.toolIntegration.findMany({
			where: {
				source: "SLACK",
				isActive: true,
			},
		});

		for (const integration of integrations) {
			// Queue sync job (use job queue in production)
			logger.info(
				`Queuing incremental sync for ${type} in org ${integration.organizationId}`
			);

			// Create activity log
			await prisma.activity.create({
				data: {
					organizationId: integration.organizationId,
					action: `webhook.${type}_changed`,
					metadata: { source: "SLACK", data },
				},
			});
		}
	}
}
