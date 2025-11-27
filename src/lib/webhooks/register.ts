import { ToolSource } from "@prisma/client";
import { WebhookHandler } from "./types";
import { SlackWebhookHandler } from "./slack-handlers";
import { GoogleWebhookHandler } from "./google-handler";
import { MicrosoftWebhookHandler } from "./microsoft-handler";
import { DropboxWebhookHandler } from "./dropbox-handler";

export class WebhookRegistry {
	private static handlers = new Map<ToolSource, WebhookHandler>([
		["SLACK", new SlackWebhookHandler()],
		["GOOGLE", new GoogleWebhookHandler()],
		["MICROSOFT", new MicrosoftWebhookHandler()],
		["DROPBOX", new DropboxWebhookHandler()],
	]);

	static getHandler(source: ToolSource): WebhookHandler | undefined {
		return this.handlers.get(source);
	}

	static hasHandler(source: ToolSource): boolean {
		return this.handlers.has(source);
	}
}
