"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	Crown,
	Zap,
	DollarSign,
	Loader2,
	Users,
	AlertCircle,
	RefreshCw,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	getPlanByProductId,
	getPlanByTier,
	getBillingInterval,
	FREE_PLAN,
} from "@/lib/subscription-plans";
import { useBilling } from "@/hooks/use-billing";

function BillingCard() {
	const {
		isAdmin,
		activeOrganization,
		subscription,
		isUpgrading,
		isSyncing,
		userCount,
		recommendedPlan,
		userCountSource,
		userCountVerified,
		eligiblePlans,
		selectedInterval,
		userCountLastSync,
		needsUserCountSync,
		setSelectedInterval,
		handleManageBilling,
		handleSyncUserCount,
		handleUpgradeSubscription,
		handleVerifyUserCount,
	} = useBilling();

	const currentPlan = subscription
		? getPlanByProductId(subscription.productId) || FREE_PLAN
		: getPlanByTier(activeOrganization?.subscriptionTier || "free");

	const currentInterval = subscription
		? getBillingInterval(subscription.productId)
		: null;

	const getPlanIcon = (planId?: string) => {
		if (planId?.includes("enterprise"))
			return <Crown className="w-5 h-5 text-purple-500" />;
		if (planId?.includes("tier3"))
			return <Crown className="w-5 h-5 text-indigo-500" />;
		if (planId?.includes("pro"))
			return <Zap className="w-5 h-5 text-blue-500" />;
		return <DollarSign className="w-5 h-5 text-gray-500" />;
	};

	const currentPricing =
		currentPlan && currentInterval
			? currentPlan.plans[currentInterval]
			: currentPlan?.plans.yearly;

	const getSourceLabel = (source: string | null) => {
		switch (source) {
			case "GOOGLE":
				return "Google Workspace";
			case "DROPBOX":
				return "Dropbox";
			case "SLACK":
				return "Slack";
			case "MANUAL":
				return "Manual Verification";
			default:
				return "Unknown";
		}
	};

	return (
		<>
			{/* User Count Sync Alert */}
			{needsUserCountSync && (
				<Alert className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
					<AlertCircle className="h-4 w-4 text-amber-600" />
					<AlertDescription className="flex items-center justify-between">
						<span>
							<strong>Action Required:</strong> Connect Google
							Workspace, Dropbox, or Slack to detect your user
							count and see available plans.
						</span>
						<Button
							size="sm"
							variant="outline"
							onClick={handleSyncUserCount}
							disabled={isSyncing}
						>
							{isSyncing ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Syncing...
								</>
							) : (
								<>
									<RefreshCw className="mr-2 h-4 w-4" />
									Sync Now
								</>
							)}
						</Button>
					</AlertDescription>
				</Alert>
			)}

			{/* Tier Mismatch Alert */}
			{userCount &&
				recommendedPlan &&
				recommendedPlan.id !== currentPlan?.id &&
				!needsUserCountSync && (
					<Alert className="mb-6 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
						<AlertCircle className="h-4 w-4 text-blue-600" />
						<AlertDescription>
							<strong>Recommended Tier:</strong> We detected{" "}
							<strong>{userCount} users</strong> from{" "}
							{getSourceLabel(userCountSource)}. We recommend{" "}
							<strong>{recommendedPlan.name}</strong> (
							{recommendedPlan.minUsers}-
							{recommendedPlan.maxUsers} users) for optimal
							performance.
						</AlertDescription>
					</Alert>
				)}

			{/* Out of Range Alert */}
			{userCount &&
				(userCount < 1 || userCount > 2000) &&
				!needsUserCountSync && (
					<Alert className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20">
						<AlertCircle className="h-4 w-4 text-red-600" />
						<AlertDescription>
							{userCount < 1 ? (
								<>
									Your organization has{" "}
									<strong>{userCount} users</strong>, which is
									below our minimum of 1 users for Pro plans.
									Please stay on the Free plan or contact
									sales for custom pricing.
								</>
							) : (
								<>
									Your organization has{" "}
									<strong>{userCount} users</strong>, which
									exceeds our maximum of 2,000 users for
									self-service plans. Please contact sales for
									enterprise pricing.
								</>
							)}
						</AlertDescription>
					</Alert>
				)}

			<div className="grid gap-6 md:grid-cols-2">
				{/* Current Plan Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{getPlanIcon(currentPlan?.id)}
							Current Plan
						</CardTitle>
						<CardDescription>
							You are on the {currentPlan?.name}
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
							<span className="text-muted-foreground text-sm">
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

						{/* User Count Display */}
						<div className="space-y-3">
							<div className="flex items-center justify-between text-sm">
								<span className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									Detected Users
								</span>
								<div className="flex items-center gap-2">
									{userCount ? (
										<>
											<span className="font-medium">
												{userCount}
											</span>
											{userCountVerified ? (
												<Badge
													variant="secondary"
													className="text-xs gap-1"
												>
													<CheckCircle2 className="h-3 w-3" />
													Verified
												</Badge>
											) : (
												<Button
													size="sm"
													variant="ghost"
													onClick={
														handleVerifyUserCount
													}
												>
													Verify
												</Button>
											)}
										</>
									) : (
										<span className="text-muted-foreground">
											Not synced
										</span>
									)}
								</div>
							</div>

							{userCountSource && userCountLastSync && (
								<p className="text-xs text-muted-foreground">
									Last synced from{" "}
									{getSourceLabel(userCountSource)} on{" "}
									{userCountLastSync.toLocaleDateString()}
								</p>
							)}

							{!userCount && (
								<Button
									size="sm"
									variant="outline"
									className="w-full"
									onClick={handleSyncUserCount}
									disabled={isSyncing}
								>
									{isSyncing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Syncing...
										</>
									) : (
										<>
											<RefreshCw className="mr-2 h-4 w-4" />
											Sync User Count
										</>
									)}
								</Button>
							)}

							{currentPlan?.id !== "free" && userCount && (
								<p className="text-xs text-muted-foreground">
									Your plan supports {currentPlan.minUsers}-
									{currentPlan.maxUsers} users
								</p>
							)}
						</div>

						<Separator />

						{/* Features List */}
						<div className="border-t pt-4">
							<h4 className="font-medium mb-3 text-sm">
								Features included:
							</h4>
							<div className="space-y-2">
								{currentPlan?.features
									.slice(0, 5)
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
						{/* Billing Interval Toggle (only for free tier with eligible plans) */}
						{currentPlan?.id === "free" &&
							eligiblePlans.length > 0 && (
								<div className="w-full">
									<p className="text-xs text-muted-foreground mb-2">
										Choose billing cycle:
									</p>
									<div className="inline-flex w-full items-center gap-2 p-1 bg-secondary rounded-lg">
										<Button
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
										</Button>
										<Button
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
												(Required)
											</span>
										</Button>
									</div>
								</div>
							)}

						<Button
							className="w-full"
							onClick={handleUpgradeSubscription}
							disabled={
								!isAdmin ||
								isUpgrading ||
								!userCount ||
								eligiblePlans.length === 0 ||
								needsUserCountSync
							}
						>
							{isUpgrading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Loading...
								</>
							) : currentPlan?.id === "enterprise" ? (
								"Contact Sales"
							) : currentPlan?.id.includes("tier3") ? (
								"Book Demo"
							) : currentPlan?.id === "free" ? (
								`Upgrade to Pro (${
									selectedInterval === "yearly"
										? "Annual"
										: "Monthly"
								})`
							) : (
								"Change Plan"
							)}
						</Button>

						{subscription && (
							<Button
								variant="outline"
								className="w-full"
								onClick={handleManageBilling}
								disabled={!isAdmin}
							>
								Manage Billing
							</Button>
						)}
					</CardFooter>
				</Card>

				{/* Plan Info Card */}
				<Card className="border-primary/20 bg-primary/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Zap className="h-5 w-5 text-primary" />
							What&apos;s Included
						</CardTitle>
						<CardDescription>
							{currentPlan?.id === "free"
								? "Upgrade to unlock full features"
								: "Your current plan benefits"}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{currentPlan?.id === "free" &&
							eligiblePlans.length > 0 && (
								<>
									<p className="text-sm font-medium">
										Ready to upgrade?
									</p>
									<div className="space-y-2">
										{eligiblePlans.map((plan) => (
											<div
												key={plan.id}
												className="p-3 bg-background rounded-lg border border-border"
											>
												<div className="flex items-center justify-between mb-2">
													<span className="font-medium text-sm">
														{plan.name}
													</span>
													{plan.popular && (
														<Badge
															variant="default"
															className="text-xs"
														>
															Popular
														</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground mb-2">
													{plan.minUsers}-
													{plan.maxUsers} users
												</p>
												<p className="text-lg font-bold text-primary">
													{plan.price}
												</p>
											</div>
										))}
									</div>
								</>
							)}

						{currentPlan?.id !== "free" && (
							<>
								<Separator />
								<div className="space-y-3">
									<div className="flex items-start gap-3">
										<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
											<CheckCircle2 className="h-4 w-4 text-primary" />
										</div>
										<div>
											<p className="text-sm font-medium">
												Unlimited Cleanups
											</p>
											<p className="text-xs text-muted-foreground">
												Run as many cleanup scans as you
												need
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
											<CheckCircle2 className="h-4 w-4 text-primary" />
										</div>
										<div>
											<p className="text-sm font-medium">
												30-Day Undo
											</p>
											<p className="text-xs text-muted-foreground">
												Reverse any action within 30
												days
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
											<CheckCircle2 className="h-4 w-4 text-primary" />
										</div>
										<div>
											<p className="text-sm font-medium">
												Priority Support
											</p>
											<p className="text-xs text-muted-foreground">
												{currentPlan.id.includes(
													"tier3"
												)
													? "24h response time"
													: "48h response time"}
											</p>
										</div>
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Founders Circle Notice */}
			{currentPlan?.id !== "free" && currentPlan?.id !== "enterprise" && (
				<Card className="mt-6 border-amber-500/20 bg-amber-50 dark:bg-amber-950/20">
					<CardContent className="pt-6">
						<div className="flex items-start gap-4">
							<div className="p-2 rounded-lg bg-amber-500/10">
								<Crown className="h-5 w-5 text-amber-600" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold mb-1 text-amber-900 dark:text-amber-100">
									Founders Circle Member
								</h4>
								<p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
									Your pricing is locked forever at $
									{currentPricing?.priceValue}/
									{currentInterval}. After 50 customers,
									we&apos;ll switch to per-user pricing
									(~$4/seat/month), but you&apos;re
									grandfathered in.
								</p>
								<Badge
									variant="secondary"
									className="bg-amber-500/20 text-amber-900 dark:text-amber-100 border-0"
								>
									Locked Forever
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* 30-Day Undo Safety Net Info */}
			{currentPlan?.id !== "free" && (
				<Card className="mt-6 border-blue-500/20 bg-blue-50 dark:bg-blue-950/20">
					<CardContent className="pt-6">
						<div className="flex items-start gap-4">
							<div className="p-2 rounded-lg bg-blue-500/10">
								<AlertCircle className="h-5 w-5 text-blue-600" />
							</div>
							<div className="flex-1">
								<h4 className="font-semibold mb-1 text-blue-900 dark:text-blue-100">
									30-Day Undo Safety Net
								</h4>
								<p className="text-sm text-blue-800 dark:text-blue-200">
									Every cleanup action can be reversed within
									30 days. Archived files are stored securely
									and can be restored with one click—no data
									is permanently deleted without your explicit
									approval.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</>
	);
}

export default BillingCard;
