import { logger } from "better-auth";
import { inngest } from "../client";

export const sendTelegramMessageJob = inngest.createFunction(
	{
		id: "send-telegram-messae",
		name: "Send Telegram Message Actions",
		retries: 1,
	},
	{ event: "telegram/send-message" },
	async ({ event, step }) => {
		const { bot_token, chat_id, text } = event.data;

		await step.run("send", async () => {
			const response = await fetch(
				`https://api.telegram.org/bot${bot_token}/sendMessage`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chat_id,
						text,
						parse_mode: "HTML",
					}),
				}
			);

			// Issue #2: Check if the request was successful
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				logger.error("SEND_TELEGRAM_MESSAGE_ERROR:", errorData);
				return { success: false, error: errorData };
			}
			return { success: true };
		});
	}
);
