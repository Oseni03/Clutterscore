"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { createOrganization } from "@/server/organizations";
import { APP_NAME } from "@/lib/config";
import { logger } from "@/lib/logger";

const formSchema = z.object({
	name: z
		.string()
		.min(2, "Workspace name must be at least 2 characters")
		.max(50, "Workspace name must be less than 50 characters"),
	targetScore: z
		.number()
		.min(0, "Target score must be at least 0")
		.max(100, "Target score must be at most 100"),
	subscriptionTier: z
		.enum(["free", "pro", "enterprise"])
		.default("free")
		.catch("free"),
});

interface OnboardingFormProps {
	user: {
		id: string;
		email: string;
		name?: string;
	};
}

export function OnboardingFormContent({ user }: OnboardingFormProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [showToast, setShowToast] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema) as unknown as Resolver<
			z.infer<typeof formSchema>
		>,
		defaultValues: {
			name: "",
			targetScore: 80,
			subscriptionTier: "free",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			setIsLoading(true);

			const { data, success, error } = await createOrganization(user.id, {
				name: values.name,
				targetScore: values.targetScore,
				subscriptionTier: "free",
			});

			if (!data || !success) {
				toast.error(error || "Failed to create workspace");
				return;
			}

			setShowToast(true);
			setTimeout(() => {
				router.push("/dashboard/settings/integrations");
				router.refresh();
			}, 1000);
		} catch (error) {
			logger.error("Error creating workspace:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create workspace"
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="w-full max-w-[520px] rounded-xl border border-border bg-background p-6 sm:p-10">
			<div
				aria-hidden="true"
				className="size-14 rounded-full bg-orb"
			/>

			<h1 className="mt-6 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[36px]">
				Welcome to {APP_NAME}
			</h1>
			<p className="mt-3 text-muted-foreground">
				Let&apos;s set up your first workspace. It takes under a minute.
			</p>

			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="mt-7"
				>
					<div>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="mb-2 text-[13px] font-medium">
										Workspace name
									</FormLabel>
									<FormControl>
										<Input
											placeholder="Acme Inc."
											className="h-12 rounded-md px-4 text-[15px]"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="mt-5">
						<FormField
							control={form.control}
							name="targetScore"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="mb-2 text-[13px] font-medium">
										Target ClutterScore (0 to 100)
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min="0"
											max="100"
											placeholder="80"
											className="h-12 rounded-md px-4 text-[15px]"
											{...field}
											onChange={(e) =>
												field.onChange(
													parseInt(e.target.value) || 0
												)
											}
										/>
									</FormControl>
									<FormDescription className="mt-1.5 text-xs">
										The score you want your workspace to
										reach.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="mt-6 flex gap-3 rounded-md bg-muted px-[18px] py-4">
						<span
							aria-hidden="true"
							className="mt-2 size-2 shrink-0 rounded-full bg-ink"
						/>
						<p className="text-sm text-muted-foreground">
							<span className="font-semibold text-foreground">
								What happens next.
							</span>{" "}
							We create your workspace on the Free plan, then take
							you to Integrations to connect up to 3 tools.
						</p>
					</div>

					<Button
						type="submit"
						disabled={isLoading || showToast}
						className="mt-6 h-12 w-full rounded-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Creating workspace...
							</>
						) : (
							"Create workspace"
						)}
					</Button>
				</form>
			</Form>

			{showToast && (
				<div
					role="status"
					className="fixed bottom-6 right-6 z-50 flex max-w-[340px] items-start gap-3 rounded-md bg-night p-4 text-paper shadow-lg"
				>
					<span className="flex size-[18px] shrink-0 items-center justify-center rounded-sm bg-lime">
						<Check className="size-3 text-ink" strokeWidth={3} />
					</span>
					<div className="text-sm">
						<div className="font-semibold text-paper">
							Workspace created
						</div>
						<div className="mt-0.5 text-[#A8A8A2]">
							Taking you to Integrations to connect your first
							tool.
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export function OnboardingForm({ user }: OnboardingFormProps) {
	return (
		<Suspense fallback={null}>
			<OnboardingFormContent user={user} />
		</Suspense>
	);
}
