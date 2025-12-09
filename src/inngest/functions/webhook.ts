import { inngest } from "../client";
import { WebhookRegistry } from "@/lib/webhooks/register";

export const webhookHandler = inngest.createFunction(
	{
		id: "handle-webhook",
		name: "Handle Webhook Event",
		retries: 2,
	},
	{ event: "handler/webhook" },
	async ({ event, step }) => {
		const { source, eventType, data } = event.data;

		await step.run("handle", async () => {
			const handler = WebhookRegistry.getHandler(source);

			await handler!.handle({
				source,
				eventType,
				data,
				timestamp: new Date(),
			});
			return { success: true, source };
		});
	}
);
