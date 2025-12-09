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
		const { to, subject, body } = event.data;

		await step.run("send", async () => {
			const resp = await sendEmail({
				to,
				subject,
				react: body,
			});
			if (!resp.success) {
				logger.error("SEND_EMAIL_ERROR", resp.error);
			}
			return resp;
		});
	}
);
