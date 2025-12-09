import { inngest } from "@/inngest/client";

type LogSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL" | "SUCCESS";

export function formatTelegramMessage(
	appName: string,
	message: string,
	severity: LogSeverity
) {
	const severityMap: Record<LogSeverity, string> = {
		INFO: "ℹ️ <b>INFO</b>",
		WARNING: "⚠️ <b>WARNING</b>",
		ERROR: "❌ <b>ERROR</b>",
		CRITICAL: "🔥 <b>CRITICAL</b>",
		SUCCESS: "✅ <b>SUCCESS</b>",
	};

	const header = severityMap[severity] ?? "ℹ️ <b>INFO</b>";

	return `
<b>🚀 ${appName}</b>
${header}

<pre>${message}</pre>
  `;
}

export async function sendTelegramMessage(text: string) {
	const BOT_TOKEN = process.env.TELEGRAM_API_TOKEN;
	const CHAT_ID = process.env.TELEGRAM_CHANNEL_ID;

	// Issue #1: Check BOTH env variables
	if (!BOT_TOKEN) {
		throw new Error(
			"TELEGRAM_API_TOKEN is not defined in environment variables"
		);
	}

	if (!CHAT_ID) {
		throw new Error(
			"TELEGRAM_CHANNEL_ID is not defined in environment variables"
		);
	}

	try {
		const { ids } = await inngest.send({
			name: "telegram/send-message",
			data: {
				bot_token: BOT_TOKEN,
				chat_id: CHAT_ID,
				text,
			},
		});

		// Issue #3: Return success indicator
		return { success: true, ids };
	} catch (err) {
		console.error("Telegram send error:", err);
		// Issue #4: Re-throw or return error for caller to handle
		return { success: false, error: err };
	}
}

// Alternative: More robust version with retry logic
export async function sendTelegramMessageRobust(
	text: string,
	retries = 3
): Promise<{ success: boolean; error?: string }> {
	const BOT_TOKEN = process.env.TELEGRAM_API_TOKEN;
	const CHAT_ID = process.env.TELEGRAM_CHANNEL_ID;

	if (!BOT_TOKEN || !CHAT_ID) {
		const error = "Telegram credentials not configured";
		console.error(error);
		return { success: false, error };
	}

	// Issue #5: Handle long messages (Telegram limit: 4096 characters)
	if (text.length > 4096) {
		text = text.slice(0, 4093) + "...";
	}

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						chat_id: CHAT_ID,
						text,
						parse_mode: "HTML",
						// Issue #6: Add disable_web_page_preview to avoid link previews
						disable_web_page_preview: true,
					}),
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					`Telegram API error: ${response.status} - ${JSON.stringify(errorData)}`
				);
			}

			return { success: true };
		} catch (err) {
			console.error(
				`Telegram send error (attempt ${attempt}/${retries}):`,
				err
			);

			// If this was the last attempt, return error
			if (attempt === retries) {
				return {
					success: false,
					error: err instanceof Error ? err.message : String(err),
				};
			}

			// Wait before retrying (exponential backoff)
			await new Promise((resolve) =>
				setTimeout(resolve, Math.pow(2, attempt) * 1000)
			);
		}
	}

	return { success: false, error: "Max retries exceeded" };
}
