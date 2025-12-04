import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(data: {
	to: string;
	subject: string;
	react: React.ReactNode;
}) {
	try {
		const { data: result, error } = await resend.emails.send({
			from: "Clusterscore <organization@resend.dev>",
			to: data.to,
			subject: data.subject,
			react: data.react,
		});

		if (error) {
			return { error, success: false };
		}

		return { data: result, success: true };
	} catch (error) {
		return { error, success: false };
	}
}
