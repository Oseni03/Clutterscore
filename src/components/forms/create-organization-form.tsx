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
	FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createOrganization } from "@/server/organizations";
import { SUBSCRIPTION_PLANS } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const formSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters").max(50),
	slug: z
		.string()
		.min(2, "Slug must be at least 2 characters")
		.max(50)
		.regex(
			/^[a-z0-9-]+$/,
			"Slug can only contain lowercase letters, numbers, and hyphens"
		),
	planProductId: z.string().optional(),
	trial: z.boolean().optional(),
});

export function CreateOrganizationForm() {
	const { data: session } = authClient.useSession();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [canUseTrial, setCanUseTrial] = useState(false);

	const user = session?.user;

	// Check if user can use trial (first organization)
	useEffect(() => {
		const checkTrialEligibility = async () => {
			if (!user?.id) return;

			try {
				const response = await fetch(
					"/api/organizations/check-trial-eligibility"
				);
				const data = await response.json();
				setCanUseTrial(data.eligible || false);
			} catch (error) {
				console.error("Error checking trial eligibility:", error);
				setCanUseTrial(false);
			}
		};

		checkTrialEligibility();
	}, [user?.id]);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			slug: "",
			planProductId: SUBSCRIPTION_PLANS[0]?.productId || "",
			trial: canUseTrial,
		},
	});

	// Auto-generate slug from name
	const watchName = form.watch("name");
	useEffect(() => {
		if (watchName && !form.formState.dirtyFields.slug) {
			const generatedSlug = watchName
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "");
			form.setValue("slug", generatedSlug);
		}
	}, [watchName, form]);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		if (!user) {
			toast.error("You must be logged in to create an workspace");
			return;
		}

		try {
			setIsLoading(true);
			const loadingToast = toast.loading("Creating workspace...");

			const payload = {
				name: values.name,
				slug: values.slug,
				productId: values.planProductId,
				trial: canUseTrial && !!values.trial,
			};

			const { data, success } = await createOrganization(
				user.id,
				payload
			);

			if (!data || !success) {
				toast.dismiss(loadingToast);
				toast.error("Failed to create workspace");
				return;
			}

			toast.dismiss(loadingToast);

			const selectedProductId = payload.productId;
			const isPaidPlan = selectedProductId && selectedProductId !== "";

			// If paid plan selected, initiate checkout
			if (isPaidPlan && !payload.trial) {
				try {
					toast.loading("Redirecting to checkout...");

					const { data: checkoutData, error } =
						await authClient.checkout({
							products: [selectedProductId],
							referenceId: data.id,
							allowDiscountCodes: true,
						});

					if (error) {
						console.error("Checkout error:", error);
						toast.dismiss();
						toast.error(
							"Failed to start checkout. Redirecting to dashboard."
						);
						router.push("/dashboard");
						return;
					}

					if (checkoutData?.url) {
						toast.dismiss();
						window.location.href = checkoutData.url;
						return;
					}

					toast.dismiss();
					toast.error(
						"No checkout URL received. Redirecting to dashboard."
					);
					router.push("/dashboard");
				} catch (err) {
					console.error("Checkout initiation failed:", err);
					toast.dismiss();
					toast.error(
						"Failed to start checkout. Redirecting to dashboard."
					);
					router.push("/dashboard");
				}
			} else {
				// Free plan or trial - redirect to dashboard
				toast.success("Workspace created successfully!");

				// Refresh session to update activeOrganizationId
				await authClient.getSession();

				router.push("/dashboard");
			}
		} catch (error) {
			console.error("Workspace creation error:", error);
			toast.dismiss();
			toast.error("Failed to create workspace");
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
								<Input
									placeholder="My Workspace"
									{...field}
									disabled={isLoading}
								/>
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
					name="slug"
					render={({ field }) => (
						<FormItem>
							<FormLabel>URL Slug</FormLabel>
							<FormControl>
								<Input
									placeholder="my-workspace"
									{...field}
									disabled={isLoading}
								/>
							</FormControl>
							<FormDescription>
								Used in your workspace&apos;s URL (lowercase,
								hyphens allowed)
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="planProductId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Subscription Plan</FormLabel>
							<FormControl>
								<RadioGroup
									value={field.value}
									onValueChange={field.onChange}
									disabled={isLoading}
									className="grid grid-cols-1 gap-4"
								>
									{SUBSCRIPTION_PLANS.map((plan) => (
										<label
											key={plan.id}
											className={`cursor-pointer transition-all rounded-lg border-2 p-4 ${
												field.value === plan.productId
													? "border-primary bg-primary/5"
													: "border-border hover:border-primary/50"
											} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
										>
											<div className="flex items-start gap-3">
												<RadioGroupItem
													value={plan.productId}
													className="mt-1"
													disabled={isLoading}
												/>
												<div className="flex-1">
													<div className="font-semibold text-base">
														{plan.name}
													</div>
													<div className="text-sm text-muted-foreground mb-2">
														{plan.description}
													</div>
													<div className="text-lg font-bold mb-3">
														{plan.price}
														<span className="text-sm font-normal text-muted-foreground ml-1">
															{plan.period}
														</span>
													</div>
													<div className="space-y-1">
														{plan.features.map(
															(feature, idx) => (
																<div
																	key={idx}
																	className="text-sm flex items-start gap-2"
																>
																	<span className="text-primary mt-0.5">
																		✓
																	</span>
																	<span>
																		{
																			feature
																		}
																	</span>
																</div>
															)
														)}
													</div>
												</div>
											</div>
										</label>
									))}
								</RadioGroup>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{canUseTrial && (
					<FormField
						control={form.control}
						name="trial"
						render={({ field }) => (
							<FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
								<FormControl>
									<Checkbox
										checked={!!field.value}
										onCheckedChange={field.onChange}
										disabled={isLoading}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel className="font-medium">
										Start 14-day free trial
									</FormLabel>
									<FormDescription>
										Available for your first workspace only.
										No credit card required.
									</FormDescription>
								</div>
							</FormItem>
						)}
					/>
				)}

				<div className="flex justify-end gap-3 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/dashboard")}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating...
							</>
						) : (
							"Create Workspace"
						)}
					</Button>
				</div>
			</form>
		</Form>
	);
}
