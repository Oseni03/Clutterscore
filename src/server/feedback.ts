"use server";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

type FeedbackData = {
	title: string;
	details: string;
};

type TelegramContext = {
	appName: string;
	userEmail: string;
};

function formatTelegramFeedback(
	appName: string,
	userEmail: string,
	title: string,
	details: string
) {
	return `
<b>📝 New Feedback Received</b>

<b>App:</b> ${appName}
<b>User:</b> ${userEmail}

<b>Title:</b> ${title}

<b>Details:</b>
<pre>${details}</pre>
  `;
}

export async function submitFeedback(
	organizationId: string,
	userId: string,
	feedback: FeedbackData,
	telegramContext?: TelegramContext
) {
	try {
		// Your existing database logic here
		await prisma.feedback.create({
			data: {
				title: feedback.title,
				details: feedback.details,
				userId,
				organizationId,
			},
		});

		// Send Telegram notification (only runs on server)
		if (telegramContext) {
			const formatted = formatTelegramFeedback(
				telegramContext.appName,
				telegramContext.userEmail,
				feedback.title,
				feedback.details
			);
			await sendTelegramMessage(formatted);
		}

		return { success: true };
	} catch (error) {
		logger.error("Feedback submission error:", error);
		return {
			success: false,
			error: "Failed to submit feedback",
		};
	}
}
