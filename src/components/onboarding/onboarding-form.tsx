"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Building2, Target, Check } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/logo";
import { createOrganization } from "@/server/organizations";
import { authClient } from "@/lib/auth-client";
import { SUBSCRIPTION_PLANS } from "@/lib/utils";

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

export function OnboardingForm({ user }: OnboardingFormProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema) as unknown as Resolver<
			z.infer<typeof formSchema>
		>,
		defaultValues: {
			name: user.name || user.email.split("@")[0],
			targetScore: 75,
			subscriptionTier: "free",
		},
	});

	const selectedPlan = form.watch("subscriptionTier");

	async function onSubmit(values: z.infer<typeof formSchema>) {
		try {
			setIsLoading(true);
			toast.loading("Creating your workspace...");

			// Create organization first
			const { data, success, error } = await createOrganization(user.id, {
				name: values.name,
				targetScore: values.targetScore,
				subscriptionTier: "free", // It will be free until a successful subscription
			});

			if (!data || !success) {
				toast.dismiss();
				toast.error(error || "Failed to create workspace");
				return;
			}

			// If not free plan, redirect to Polar checkout
			if (values.subscriptionTier !== "free") {
				const plan = SUBSCRIPTION_PLANS.find(
					(p) => p.id === values.subscriptionTier
				);

				if (!plan) {
					toast.dismiss();
					toast.error("Selected plan not found");
					return;
				}

				if (!plan.productId) {
					toast.dismiss();
					toast.error(
						"Product ID not configured. Please contact support."
					);
					return;
				}

				toast.dismiss();
				toast.loading("Creating your checkout session...");

				const { data: checkoutData, error: checkoutError } =
					await authClient.checkout({
						products: [plan.productId],
						referenceId: data.id,
						allowDiscountCodes: true,
					});

				if (checkoutError) {
					toast.dismiss();
					toast.error(
						checkoutError.message ||
							"Failed to create checkout session"
					);
					return;
				}

				if (checkoutData?.url) {
					toast.dismiss();
					toast.success("Redirecting to checkout...");
					window.location.href = checkoutData.url;
					return;
				}
			}

			toast.dismiss();
			toast.success("Workspace created successfully!");
			router.push(`/${data.slug}`);
			router.refresh();
		} catch (error) {
			console.error("Error creating workspace:", error);
			toast.dismiss();
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
		<Card className="border-border/80 shadow-xl max-w-5xl mx-auto">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
					<Logo className="h-8 w-8" />
				</div>
				<CardTitle className="text-3xl font-bold">
					Welcome to Clusterscore!
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
											{`This is your workspace's display
											name. A unique URL will be generated
											automatically.`}
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
											{`Set your organization's target score
											(0-100)`}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{/* Subscription Plan Selection */}
						<FormField
							control={form.control}
							name="subscriptionTier"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="text-lg font-semibold">
										Choose Your Plan
									</FormLabel>
									<FormControl>
										<div className="grid gap-4 md:grid-cols-3 mt-4">
											{SUBSCRIPTION_PLANS.map((plan) => {
												const Icon = plan.icon;
												const isSelected =
													field.value === plan.id;

												return (
													<Card
														key={plan.id}
														className={cn(
															"relative cursor-pointer transition-all hover:shadow-md",
															isSelected
																? "border-primary ring-2 ring-primary ring-offset-2"
																: "border-border hover:border-primary/50"
														)}
														onClick={() =>
															field.onChange(
																plan.id
															)
														}
													>
														{plan.popular && (
															<Badge
																className="absolute -top-2 left-1/2 -translate-x-1/2"
																variant="default"
															>
																Most Popular
															</Badge>
														)}

														<CardHeader className="pb-4">
															<div className="flex items-center justify-between">
																<div
																	className={cn(
																		"p-2 rounded-lg",
																		isSelected
																			? "bg-primary/10"
																			: "bg-muted"
																	)}
																>
																	<Icon
																		className={cn(
																			"h-5 w-5",
																			isSelected
																				? "text-primary"
																				: "text-muted-foreground"
																		)}
																	/>
																</div>
																{isSelected && (
																	<div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
																		<Check className="h-4 w-4 text-primary-foreground" />
																	</div>
																)}
															</div>
															<CardTitle className="text-xl mt-4">
																{plan.name}
															</CardTitle>
															<CardDescription className="text-sm">
																{
																	plan.description
																}
															</CardDescription>
															<div className="mt-4">
																<span className="text-3xl font-bold">
																	{plan.price}
																</span>
																<span className="text-sm text-muted-foreground">
																	{
																		plan.period
																	}
																</span>
															</div>
														</CardHeader>

														<CardContent className="pt-0">
															<ul className="space-y-2">
																{plan.features.map(
																	(
																		feature,
																		idx
																	) => (
																		<li
																			key={
																				idx
																			}
																			className="flex items-start gap-2 text-sm"
																		>
																			<Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
																			<span className="text-muted-foreground">
																				{
																					feature
																				}
																			</span>
																		</li>
																	)
																)}
															</ul>
														</CardContent>
													</Card>
												);
											})}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Info Box */}
						<div className="rounded-xl border bg-muted/40 p-5 text-sm space-y-3">
							<div>
								<p className="font-semibold text-foreground">
									{`What's a workspace?`}
								</p>
								<p className="mt-2 text-muted-foreground">
									{`A workspace is where your team collaborates.
									You can invite members, connect
									integrations, and manage all your SaaS tools
									in one place.`}
								</p>
							</div>
							<div>
								<p className="font-semibold text-foreground">
									{`What's a target score?`}
								</p>
								<p className="mt-2 text-muted-foreground">
									{`Your target score represents the benchmark
									your organization aims to achieve. You can
									adjust this later in settings.`}
								</p>
							</div>
							{selectedPlan !== "free" && (
								<div>
									<p className="font-semibold text-foreground">
										💳 Payment
									</p>
									<p className="mt-2 text-muted-foreground">
										{`You'll be redirected to complete your
										payment after creating your workspace.
										You can cancel anytime.`}
									</p>
								</div>
							)}
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
							) : selectedPlan === "free" ? (
								"Create Free Workspace"
							) : (
								"Continue to Checkout"
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
