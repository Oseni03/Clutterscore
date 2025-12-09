"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { useState } from "react";
import { Save } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").max(50),
	email: z.string().email("Invalid email address"),
});

interface ProfileFormProps {
	initialData: {
		name: string;
		email: string;
	};
	onCancel: () => void;
	onSuccess?: () => void;
}

export function ProfileForm({
	initialData,
	onCancel,
	onSuccess,
}: ProfileFormProps) {
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: initialData.name,
			email: initialData.email,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		try {
			const data = await authClient.updateUser({
				name: values.name,
			});

			if (!data.error && data.data) {
				toast.success("Profile updated successfully");
				onSuccess?.();
			} else {
				throw new Error(
					data.error?.message || "Failed to update profile"
				);
			}
		} catch (error) {
			logger.error("UPDATE_PROFILE_ERROR: ", error);
			toast.error("Failed to update profile");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input
									placeholder="Your name"
									className="w-full sm:max-w-md"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									placeholder="Your email"
									type="email"
									disabled
									className="w-full sm:max-w-md"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex flex-col sm:flex-row gap-2 pt-2">
					<Button
						type="submit"
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						{isLoading ? (
							<>Saving...</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Save Changes
							</>
						)}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
				</div>
			</form>
		</Form>
	);
}
