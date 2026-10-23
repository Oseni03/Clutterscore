"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Loader2 } from "lucide-react";
import { Organization } from "@prisma/client";
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

interface UpdateOrganizationFormProps {
	organization: Organization;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function UpdateOrganizationForm({
	organization,
	onSuccess,
	onCancel,
}: UpdateOrganizationFormProps) {
	const { updateOrganization: updateOrganizationState } =
		useOrganizationStore((state) => state);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: organization.name,
			targetScore: organization.targetScore ?? 75,
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		const toastId = toast.loading("Updating workspace...");
		setIsLoading(true);

		try {
			const { data, success, error } = await updateOrganization(
				organization.id,
				values
			);

			if (!success || !data) {
				toast.error(error || "Failed to update workspace", {
					id: toastId,
				});
				return;
			}

			updateOrganizationState(data as Organization);
			toast.success("Workspace updated", { id: toastId });
			onSuccess?.();
		} catch (error) {
			logger.error("Failed to update workspace", error);
			toast.error("Failed to update workspace", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="mt-5 space-y-5"
			>
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[13px] font-medium">
								Workspace name
							</FormLabel>
							<FormControl>
								<Input
									placeholder="My workspace"
									className="h-12 rounded-xl border-border bg-background px-4 text-[15px]"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="targetScore"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-[13px] font-medium">
								Target ClutterScore
							</FormLabel>
							<FormControl>
								<Input
									type="number"
									min="0"
									max="100"
									placeholder="75"
									className="h-12 rounded-xl border-border bg-background px-4 text-[15px]"
									{...field}
									onChange={(event) =>
										field.onChange(
											parseInt(event.target.value) || 0
										)
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex flex-wrap justify-end gap-3 pt-1">
					<Button
						type="button"
						variant="secondary"
						onClick={onCancel}
						disabled={isLoading}
						className="h-11 rounded-full px-6 text-sm font-semibold"
					>
						Cancel
					</Button>
					<Button
						disabled={isLoading}
						type="submit"
						className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink/90"
					>
						{isLoading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Updating...
							</>
						) : (
							"Save changes"
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
