"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "../ui/dialog";
import { createOrganization } from "@/server/organizations";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { Organization } from "@/types";

const formSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(50, "Name must be at most 50 characters"),
	targetScore: z
		.number()
		.min(0, "Target score must be at least 0")
		.max(100, "Target score must be at most 100"),
});

export function CreateOrganizationForm() {
	const { data } = authClient.useSession();
	const { addOrganization } = useOrganizationStore((state) => state);
	const [isLoading, setIsLoading] = useState(false);

	const user = data?.user;

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			targetScore: 75,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			toast.loading("Creating Organization...");
			setIsLoading(true);

			if (!user) {
				toast.dismiss();
				toast.error("User not authenticated");
				return;
			}

			const { data, success, error } = await createOrganization(
				user.id,
				values
			);

			if (!data || !success) {
				toast.dismiss();
				toast.error(
					(error as string) || "Failed to create organization"
				);
				return;
			}

			addOrganization(data as Organization);
			toast.dismiss();
			toast.success("Organization created successfully");
		} catch (error) {
			console.error(error);
			toast.dismiss();
			toast.error("Failed to create organization");
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
									placeholder="My Organization"
									{...field}
								/>
							</FormControl>
							<FormDescription>
								A unique slug will be generated from this name
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="targetScore"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Target Score</FormLabel>
							<FormControl>
								<Input
									type="number"
									min="0"
									max="100"
									placeholder="75"
									{...field}
									onChange={(e) =>
										field.onChange(
											parseInt(e.target.value) || 0
										)
									}
								/>
							</FormControl>
							<FormDescription>
								Set your workspace&apos;s target score (0-100)
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<DialogFooter>
					<Button disabled={isLoading} type="submit">
						Create Workspace
						{isLoading && (
							<Loader2 className="size-4 animate-spin ml-2" />
						)}
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}
