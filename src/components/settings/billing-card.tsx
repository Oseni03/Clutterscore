"use client";

import React, { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Crown, Zap, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import {
	getPlanByProductId,
	getPlanByTier,
	getBillingInterval,
	getAllProductIds,
	type BillingInterval,
} from "@/lib/utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";

function BillingCard() {
	const { activeOrganization, subscription, loadSubscription, isAdmin } =
		useOrganizationStore((state) => state);
	const [isUpgrading, setIsUpgrading] = useState(false);
	const [selectedInterval, setSelectedInterval] =
		useState<BillingInterval>("yearly");

	useEffect(() => {
		if (activeOrganization?.id) {
			loadSubscription(activeOrganization.id).catch((err) => {
				logger.error("Failed to load subscription:", err);
			});
		}
	}, [activeOrganization?.id, loadSubscription]);

	const currentPlan = subscription
		? getPlanByProductId(subscription.productId)
		: getPlanByTier(activeOrganization?.subscriptionTier || "free");

	const currentInterval = subscription
		? getBillingInterval(subscription.productId)
		: null;

	const getPlanIcon = (planId?: string) => {
		switch (planId) {
			case "enterprise":
				return <Crown className="w-5 h-5 text-purple-500" />;
			case "pro":
				return <Zap className="w-5 h-5 text-blue-500" />;
			default:
				return <DollarSign className="w-5 h-5 text-gray-500" />;
		}
	};

	const handleUpgradeSubscription = async () => {
		try {
			if (!activeOrganization) {
				toast.error("No active organization selected");
				return;
			}

			if (!isAdmin) {
				toast.error(
					"You do not have permission to upgrade subscription"
				);
				return;
			}

			const productIds = getAllProductIds(selectedInterval);

			if (productIds.length === 0) {
				toast.error(
					"Product IDs are not configured. Please contact support."
				);
				return;
			}

			setIsUpgrading(true);
			toast.loading("Creating your checkout session...");

			const { data, error } = await authClient.checkout({
				products: productIds,
				referenceId: activeOrganization.id,
				allowDiscountCodes: true,
			});

			if (error) {
				throw new Error(error.message);
			}

			if (data?.url) {
				toast.dismiss();
				toast.success("Redirecting to checkout...");
				window.location.href = data.url;
			}
		} catch (error) {
			logger.error("Error creating checkout session:", error);
			toast.dismiss();
			toast.error("Failed to create checkout session");
		} finally {
			setIsUpgrading(false);
		}
	};

	const handleManageBilling = async () => {
		try {
			if (!activeOrganization) {
				toast.error("No active organization selected");
				return;
			}

			if (!isAdmin) {
				toast.error("You do not have permission to manage billing");
				return;
			}

			toast.loading("Opening billing portal...");

			const response = await fetch("/api/billing/portal", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organizationId: activeOrganization.id,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create portal session");
			}

			const { url } = await response.json();

			if (url) {
				toast.dismiss();
				toast.success("Redirecting to billing portal...");
				window.location.href = url;
			}
		} catch (error) {
			logger.error("Error opening billing portal:", error);
			toast.dismiss();
			toast.error("Failed to open billing portal");
		}
	};

	// Calculate user usage
	const userCount = 42; // Replace with actual count from your data
	const maxUsers = currentPlan?.id === "free" ? 5 : 50;
	const userPercentage = (userCount / maxUsers) * 100;

	// Get pricing for display
	const currentPricing =
		currentPlan && currentInterval
			? currentPlan.plans[currentInterval]
			: currentPlan?.plans.monthly;

	return (
		<>
			<div className="grid gap-6 md:grid-cols-2">
				{/* Current Plan Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{getPlanIcon(currentPlan?.id)}
							Current Plan
						</CardTitle>
						<CardDescription>
							You are on the {currentPlan?.name} Plan
							{currentInterval && (
								<Badge variant="secondary" className="ml-2">
									{currentInterval === "yearly"
										? "Annual"
										: "Monthly"}
								</Badge>
							)}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold">
								{currentPricing?.price || "$0"}
							</span>
							<span className="text-muted-foreground">
								{currentPricing?.period || "/month"}
							</span>
						</div>

						{subscription && (
							<>
								<div className="text-sm text-muted-foreground">
									${(subscription.amount / 100).toFixed(2)}/
									{subscription.currency.toLowerCase()} -{" "}
									<span className="capitalize">
										{subscription.status}
									</span>
								</div>

								{subscription.status === "active" && (
									<div className="text-sm text-muted-foreground">
										Current period:{" "}
										{new Date(
											subscription.currentPeriodStart
										).toLocaleDateString()}{" "}
										-{" "}
										{new Date(
											subscription.currentPeriodEnd
										).toLocaleDateString()}
									</div>
								)}

								{subscription.status === "active" &&
									subscription.cancelAtPeriodEnd && (
										<div className="text-sm text-amber-600 dark:text-amber-500">
											Cancels on{" "}
											{new Date(
												subscription.endsAt ||
													subscription.currentPeriodEnd
											).toLocaleDateString()}
										</div>
									)}
							</>
						)}

						<div className="text-sm text-muted-foreground">
							{currentPlan?.description}
						</div>

						<Separator />

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>Users</span>
								<span className="font-medium">
									{userCount} / {maxUsers}
								</span>
							</div>
							<div className="h-2 bg-secondary rounded-full overflow-hidden">
								<div
									className={`h-full transition-all ${
										userPercentage > 90
											? "bg-destructive"
											: userPercentage > 75
												? "bg-amber-500"
												: "bg-primary"
									}`}
									style={{
										width: `${Math.min(userPercentage, 100)}%`,
									}}
								/>
							</div>
							{userPercentage > 90 && (
								<p className="text-xs text-destructive">
									You&apos;re approaching your user limit.
									Consider upgrading.
								</p>
							)}
						</div>

						{/* Features List */}
						<div className="border-t pt-4">
							<h4 className="font-medium mb-3 text-sm">
								Features included:
							</h4>
							<div className="space-y-2">
								{currentPlan?.features
									.slice(0, 4)
									.map((feature, index) => (
										<div
											key={index}
											className="flex items-start gap-2 text-sm text-muted-foreground"
										>
											<div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary flex-shrink-0" />
											<span className="flex-1">
												{feature}
											</span>
										</div>
									))}
							</div>
						</div>
					</CardContent>
					<CardFooter className="flex-col gap-3">
						{/* Billing Interval Toggle (only show for free users upgrading) */}
						{currentPlan?.id === "free" && (
							<div className="w-full">
								<p className="text-xs text-muted-foreground mb-2">
									Choose billing cycle:
								</p>
								<div className="inline-flex w-full items-center gap-2 p-1 bg-secondary rounded-lg">
									<button
										onClick={() =>
											setSelectedInterval("monthly")
										}
										className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
											selectedInterval === "monthly"
												? "bg-background shadow-sm text-foreground"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										Monthly
									</button>
									<button
										onClick={() =>
											setSelectedInterval("yearly")
										}
										className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
											selectedInterval === "yearly"
												? "bg-background shadow-sm text-foreground"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										Yearly
										<span className="text-xs text-primary ml-1">
											(Save 17%)
										</span>
									</button>
								</div>
							</div>
						)}

						<Button
							className="w-full"
							onClick={handleUpgradeSubscription}
							disabled={!isAdmin || isUpgrading}
						>
							{isUpgrading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading...
								</>
							) : currentPlan?.id === "enterprise" ? (
								"Contact Sales"
							) : currentPlan?.id === "free" ? (
								`Upgrade to ${selectedInterval === "yearly" ? "Yearly" : "Monthly"}`
							) : (
								"Change Plan"
							)}
						</Button>
					</CardFooter>
				</Card>
			</div>

			{/* Savings Info for Current Subscribers */}
			{currentInterval === "monthly" && currentPlan?.id !== "free" && (
				<Card className="mt-6 border-primary/20 bg-primary/5">
					<CardContent className="pt-6">
						<div className="flex items-start gap-4">
							<div className="p-2 rounded-lg bg-primary/10">
								<Zap className="h-5 w-5 text-primary" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold mb-1">
									Switch to Yearly and Save 17%
								</h4>
								<p className="text-sm text-muted-foreground mb-3">
									Save{" "}
									{(currentPlan?.plans.monthly.priceValue ||
										0) *
										12 -
										(currentPlan?.plans.yearly.priceValue ||
											0)}{" "}
									per year by switching to annual billing
								</p>
								<Button
									variant="outline"
									size="sm"
									onClick={handleManageBilling}
									disabled={!isAdmin}
								>
									Switch to Yearly
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}

export default BillingCard;
