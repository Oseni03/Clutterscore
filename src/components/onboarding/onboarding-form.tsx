"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Building2, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import Logo from "@/components/logo";
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
	// const params = useSearchParams();
	const [isLoading, setIsLoading] = useState(false);

	// const coupon = params.get("coupon");

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema) as unknown as Resolver<
			z.infer<typeof formSchema>
		>,
		defaultValues: {
			name: "New Project",
			targetScore: 75,
			subscriptionTier: "free",
		},
	});

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			setIsLoading(true);
			const loadingToast = toast.loading("Creating your workspace...");

			// Create organization first
			const { data, success, error } = await createOrganization(user.id, {
				name: values.name,
				targetScore: values.targetScore,
				subscriptionTier: "free",
			});

			// Always dismiss the loading toast
			toast.dismiss(loadingToast);

			if (!data || !success) {
				toast.error(error || "Failed to create workspace");
				setIsLoading(false);
				return;
			}

			toast.success("Workspace created successfully!");
			router.push(`/dashboard/settings/integrations`);
			router.refresh();
		} catch (error) {
			logger.error("Error creating workspace:", error);
			toast.dismiss(); // Dismiss any active toasts
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
		<Card className="border-border/80 shadow-xl mx-auto">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
					<Logo className="h-8 w-8" />
				</div>
				<CardTitle className="text-3xl font-bold">
					{`Welcome to ${APP_NAME}!`}
				</CardTitle>
				<CardDescription className="text-base mt-2">
					{`Let's create your first workspace to get started`}
				</CardDescription>
			</CardHeader>

			<CardContent>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-8"
					>
						{/* Workspace Details */}
						<div className="space-y-6">
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
													placeholder="Acme Inc."
													className="pl-10"
													{...field}
												/>
											</div>
										</FormControl>
										<FormDescription>
											{`This is your workspace's display name. A unique URL will be generated automatically.`}
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
															parseInt(
																e.target.value
															) || 0
														)
													}
												/>
											</div>
										</FormControl>
										<FormDescription>
											{`Set your workspace's target score (0-100)`}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Info Box */}
						<div className="rounded-xl border bg-muted/40 p-5 text-sm space-y-3">
							<div>
								<p className="font-semibold text-foreground">
									{`What's a workspace?`}
								</p>
								<p className="mt-2 text-muted-foreground">
									{`A workspace is where your team collaborates. You can invite members, connect integrations, and manage all your SaaS tools in one place.`}
								</p>
							</div>
							<div>
								<p className="font-semibold text-foreground">
									{`What's a target score?`}
								</p>
								<p className="mt-2 text-muted-foreground">
									{`Your target score represents the benchmark your workspace aims to achieve. You can adjust this later in settings.`}
								</p>
							</div>
							{/* {selectedPlan !== "free" && (
								<div>
									<p className="font-semibold text-foreground">
										💳 Payment & Billing
									</p>
									<p className="mt-2 text-muted-foreground">
										{billingInterval === "yearly"
											? `You'll be billed annually and save 17% compared to monthly billing. `
											: `You'll be billed monthly. Switch to yearly anytime to save 17%. `}
										{`You can cancel anytime and manage your subscription in settings.`}
									</p>
								</div>
							)} */}
						</div>

						<Button
							type="submit"
							size="lg"
							className="w-full"
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating workspace...
								</>
							) : (
								"Create Free Workspace"
							)}
						</Button>

						<p className="text-xs text-center text-muted-foreground">
							By continuing, you agree to our Terms of Service and
							Privacy Policy
						</p>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

export function OnboardingForm({ user }: OnboardingFormProps) {
	return (
		<Suspense fallback={"loading..."}>
			<OnboardingFormContent user={user} />
		</Suspense>
	);
}
