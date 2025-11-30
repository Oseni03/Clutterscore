"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Building2, Crown, Zap } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/utils";
import { toast } from "sonner";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";

const SubscriptionCard = () => {
	const { activeOrganization, isAdmin, subscription, loadSubscription } =
		useOrganizationStore((state) => state);

	useEffect(() => {
		if (activeOrganization?.id) {
			// load latest subscription from API if not present
			loadSubscription(activeOrganization.id).catch((err) => {
				console.error("Failed to load subscription:", err);
			});
		}
	}, [activeOrganization?.id, loadSubscription]);

	const productIds = SUBSCRIPTION_PLANS.map((plan) => plan.productId).filter(
		Boolean
	);

	const handleSubscriptionUpgrade = async () => {
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

			if (productIds.length === 0) {
				toast.error(
					"Product IDs are not configured. Please contact support."
				);
				return;
			}

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
			console.error("Error creating checkout session:", error);
			toast.dismiss();
			toast.error("Failed to create checkout session");
		}
	};

	const getSubscriptionFeatures = (subscription: string) => {
		const plan = SUBSCRIPTION_PLANS.find(
			(plan) => plan.id === subscription
		);

		return plan?.features;
	};

	const getPlanFromProductId = (productId: string) => {
		return SUBSCRIPTION_PLANS.find((plan) => plan.productId === productId);
	};

	const getSubscriptionIcon = (productId: string) => {
		const plan = getPlanFromProductId(productId);
		switch (plan?.id) {
			case "enterprise":
				return <Crown className="w-5 h-5 text-purple-500" />;
			case "pro":
				return <Zap className="w-5 h-5 text-blue-500" />;
			default:
				return <Building2 className="w-5 h-5 text-gray-500" />;
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{activeOrganization?.subscription &&
						getSubscriptionIcon(
							activeOrganization.subscription.productId
						)}
					Subscription Plan
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<h3 className="text-lg font-semibold capitalize">
							{subscription
								? getPlanFromProductId(subscription.productId)
										?.name
								: "Free"}{" "}
							Plan
						</h3>
						<p className="text-sm text-muted-foreground">
							{subscription ? (
								<>
									${(subscription.amount / 100).toFixed(2)}/
									{subscription.currency.toLowerCase()}
									{subscription.status === "active" &&
										subscription.cancelAtPeriodEnd &&
										` (Cancels on ${new Date(
											subscription.endsAt ||
												subscription.currentPeriodEnd
										).toLocaleDateString()})`}
								</>
							) : (
								"Free tier"
							)}
						</p>
						{subscription && (
							<>
								<p className="text-xs text-muted-foreground mt-1">
									Current period:{" "}
									{new Date(
										subscription.currentPeriodStart
									).toLocaleDateString()}{" "}
									-{" "}
									{new Date(
										subscription.currentPeriodEnd
									).toLocaleDateString()}
								</p>
								{subscription.status === "active" &&
									subscription.cancelAtPeriodEnd &&
									subscription.customerCancellationReason && (
										<p className="text-xs text-muted-foreground mt-1">
											Cancellation reason:{" "}
											{
												subscription.customerCancellationReason
											}
										</p>
									)}
							</>
						)}
					</div>
					<Button
						variant="outline"
						disabled={!isAdmin}
						className="w-full sm:w-auto"
						onClick={handleSubscriptionUpgrade}
					>
						Upgrade Plan
					</Button>
				</div>

				<div className="border-t pt-4">
					<h4 className="font-medium mb-3">Features included:</h4>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{getSubscriptionFeatures(
							getPlanFromProductId(subscription?.productId || "")
								?.id || "free"
						)?.map((feature, index) => (
							<div
								key={index}
								className="flex items-start sm:items-center gap-2 text-sm"
							>
								<div className="w-1.5 h-1.5 mt-1.5 sm:mt-0 rounded-full bg-primary flex-shrink-0" />
								<span className="flex-1">{feature}</span>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default SubscriptionCard;
