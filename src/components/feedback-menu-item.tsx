"use client";

import * as React from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackForm } from "@/hooks/use-feedback-form";
import { SidebarMenuButton } from "./ui/sidebar";
import { Send } from "lucide-react";

export function FeedbackMenuItem() {
	const { form, onSubmit, loading } = useFeedbackForm();

	const handleSubmit = async (values: { title: string; details: string }) => {
		await onSubmit(values);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<SidebarMenuButton size="sm">
					<Send />
					<span>Feedback</span>
				</SidebarMenuButton>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Send Feedback</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-4 mt-2"
					>
						<FormField
							control={form.control}
							name="title"
							rules={{ required: "Title is required" }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input
											placeholder="Brief summary of your feedback"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="details"
							rules={{ required: "Details are required" }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Details</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe your issue or suggestion..."
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end space-x-2 pt-2">
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={loading}>
								{loading ? "Submitting..." : "Submit"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
