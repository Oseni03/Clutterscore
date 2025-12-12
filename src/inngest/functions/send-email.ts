import { sendEmail } from "@/lib/resend";
import { inngest } from "../client";
import { logger } from "@/lib/logger";

export const sendEmailJob = inngest.createFunction(
	{
		id: "send-email",
		name: "Send Email Actions",
		retries: 2,
	},
	{ event: "email/send" },
	async ({ event, step }) => {
		const { to, subject, html } = event.data; // Change body to html

		await step.run("send", async () => {
			const resp = await sendEmail({
				to,
				subject,
				html, // Pass the pre-rendered HTML
			});
			if (!resp.success) {
				logger.error("SEND_EMAIL_ERROR", resp.error);
			}
			return resp;
		});
	}
);
