"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitFeedback } from "@/server/feedback";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { APP_NAME } from "@/lib/config";
import { logger } from "@/lib/logger";

export type FeedbackFormValues = {
	title: string;
	details: string;
};

export function useFeedbackForm() {
	const { data: session } = authClient.useSession();
	const { activeOrganization } = useOrganizationStore((state) => state);

	const form = useForm<FeedbackFormValues>({
		defaultValues: {
			title: "",
			details: "",
		},
	});

	const [loading, setLoading] = useState(false);

	const onSubmit = async (values: FeedbackFormValues) => {
		if (!session?.user || !activeOrganization) {
			throw new Error("User must be authenticated to submit feedback.");
		}

		setLoading(true);

		try {
			// Pass all data to server action - it will handle Telegram notification
			const result = await submitFeedback(
				activeOrganization.id,
				session.user.id,
				{
					title: values.title,
					details: values.details,
				},
				{
					appName: `${APP_NAME} - ${activeOrganization.name}`,
					userEmail: session.user.email!,
				}
			);

			if (result.success) {
				toast.success("Thanks for your feedback!");
				form.reset();
			} else {
				toast.error(result.error || "Failed to submit feedback.");
			}
		} catch (error) {
			logger.error("Feedback error:", error);
			toast.error("Something went wrong while submitting your feedback.");
		} finally {
			setLoading(false);
		}
	};

	return { form, onSubmit, loading };
}
