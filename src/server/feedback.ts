"use server";

import { prisma } from "@/lib/prisma";

export type SubmitFeedbackInput = {
	title: string;
	details: string;
};

export async function submitFeedback(
	organizationId: string,
	userId: string,
	input: SubmitFeedbackInput
) {
	try {
		// Save feedback to database
		const feedback = await prisma.feedback.create({
			data: {
				title: input.title,
				details: input.details,
				userId,
				organizationId,
			},
		});

		return {
			success: true,
			data: feedback,
		};
	} catch (error) {
		console.error("Error submitting feedback:", error);
		return {
			success: false,
			error: "Failed to submit feedback. Please try again.",
		};
	}
}
