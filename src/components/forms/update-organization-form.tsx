"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Building2, Loader2, Target } from "lucide-react";
import { Organization } from "@prisma/client";
import { DialogFooter } from "../ui/dialog";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { updateOrganization } from "@/server/organizations";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	name: z
		.string()
		.min(2, "Name must be at least 2 characters")
		.max(50, "Name must be less than 50 characters"),
	targetScore: z
		.number()
		.min(0, "Target score must be at least 0")
		.max(100, "Target score must be at most 100"),
});

export function UpdateOrganizationForm({
	organization,
}: {
	organization: Organization;
}) {
	const { updateOrganization: updateOrganizationState } =
		useOrganizationStore((state) => state);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: organization.name,
			targetScore: organization.targetScore || 75,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			toast.loading("Updating workspace...");
			setIsLoading(true);

			const { data, success, error } = await updateOrganization(
				organization.id,
				values
			);

			if (!success || !data) {
				toast.dismiss();
				toast.error(error || "Failed to update workspace");
				return;
			}

			updateOrganizationState(data as Organization);
			toast.dismiss();
			toast.success("Workspace updated successfully");
		} catch (error) {
			logger.error("Failed to update workspace", error);
			toast.dismiss();
			toast.error("Failed to update workspace");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Workspace Name</FormLabel>
							<FormControl>
								<div className="relative">
									<Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="My Workspace"
										className="pl-10"
										{...field}
									/>
								</div>
							</FormControl>
							<FormDescription>
								The display name for your workspace
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
								<div className="relative">
									<Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										type="number"
										min="0"
										max="100"
										placeholder="75"
										className="pl-10"
										{...field}
										onChange={(e) =>
											field.onChange(
												parseInt(e.target.value) || 0
											)
										}
									/>
								</div>
							</FormControl>
							<FormDescription>
								{`Your organization's target ClutterScore (0-100)`}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
					<p className="font-medium text-foreground">
						📝 Note about workspace URL
					</p>
					<p className="text-muted-foreground">
						{`The workspace slug (URL) cannot be changed after
						creation. If you need a different URL, you'll need to
						create a new workspace.`}
					</p>
				</div>

				<DialogFooter>
					<Button
						disabled={isLoading}
						type="submit"
						className="w-full sm:w-auto"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Updating...
							</>
						) : (
							"Update Workspace"
						)}
					</Button>
				</DialogFooter>
			</form>
		</Form>
	);
}
