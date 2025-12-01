"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { submitFeedback } from "@/server/feedback";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";

export type FeedbackFormValues = {
	title: string;
	details: string;
};

export function useFeedbackForm() {
	const { data: session } = authClient.useSession();
	const { activeOrganization } = useOrganizationStore((state) => state);
	if (!session?.user || !activeOrganization) {
		throw new Error("User must be authenticated to submit feedback.");
	}

	const form = useForm<FeedbackFormValues>({
		defaultValues: {
			title: "",
			details: "",
		},
	});

	const [loading, setLoading] = useState(false);

	const onSubmit = async (values: FeedbackFormValues) => {
		setLoading(true);

		try {
			const result = await submitFeedback(
				activeOrganization.id,
				session.user.id,
				{
					title: values.title,
					details: values.details,
				}
			);

			if (result.success) {
				toast.success("Thanks for your feedback!");
				form.reset();
			} else {
				toast.error(result.error || "Failed to submit feedback.");
			}
		} catch (error) {
			console.error("Feedback error:", error);
			toast.error("Something went wrong while submitting your feedback.");
		} finally {
			setLoading(false);
		}
	};

	return { form, onSubmit, loading };
}
