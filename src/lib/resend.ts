import { Resend } from "resend";
import { APP_NAME } from "./config";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(data: {
	to: string;
	subject: string;
	html?: string;
	react?: React.ReactNode;
}) {
	try {
		const { data: result, error } = await resend.emails.send({
			from: `${APP_NAME} <${APP_NAME.toLowerCase()}@resend.dev>`,
			to: data.to,
			subject: data.subject,
			// Use html if provided, otherwise use react
			...(data.html ? { html: data.html } : { react: data.react }),
		});

		if (error) {
			return { error, success: false };
		}

		return { data: result, success: true };
	} catch (error) {
		return { error, success: false };
	}
}

export async function sendBulkEmail(data: {
	to: string[];
	subject: string;
	react: React.ReactNode;
}) {
	try {
		const { data: result, error } = await resend.batch.send(
			data.to.map((user) => ({
				from: `${APP_NAME} <${APP_NAME.toLowerCase()}@resend.dev>`,
				to: user,
				subject: data.subject,
				react: data.react,
			}))
		);

		if (error) {
			return { error, success: false };
		}

		return { data: result, success: true };
	} catch (error) {
		return { error, success: false };
	}
}
