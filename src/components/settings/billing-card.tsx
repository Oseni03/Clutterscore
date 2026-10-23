"use client";

import { useMemo, type ReactNode } from "react";
import { format } from "date-fns";
import {
	Check,
	CircleCheck,
	CreditCard,
	Loader2,
	RefreshCw,
	ShieldCheck,
	Sparkles,
	Star,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/hooks/use-billing";
import {
	FREE_PLAN,
	SUBSCRIPTION_PLANS,
	getBillingInterval,
	getPlan,
	getPlanByProductId,
	getPlanByTier,
	type BillingInterval,
	type SubscriptionPlan,
} from "@/lib/subscription-plans";

const INCLUDED_FEATURES = [
	"Unlimited audits",
	"Execute playbooks",
	"All four integrations",
	"More members",
	"30-day undo on every action",
	"Priority sync",
];

function getSourceLabel(source: string | null) {
	switch (source) {
		case "GOOGLE":
			return "Google Workspace";
		case "DROPBOX":
			return "Dropbox";
		case "SLACK":
			return "Slack";
		case "MANUAL":
			return "Manual verification";
		default:
			return "your integrations";
	}
}

function InfoTile({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="rounded-xl bg-muted p-3.5">
			<p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
				{label}
			</p>
			<div className="mt-1.5 text-sm font-semibold">{children}</div>
		</div>
	);
}

export default function BillingCard() {
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

	const displayInterval: BillingInterval = selectedInterval;
	const currentPricing = currentPlan.plans[currentInterval ?? selectedInterval];
	const billingLabel = currentInterval
		? currentInterval === "yearly"
			? "Billed yearly"
			: "Billed monthly"
		: currentPlan.id === "free"
			? "Free forever"
			: `Billed ${displayInterval}`;

	const hasDetectedUsers = typeof userCount === "number" && userCount > 0;
	const showTierMismatch =
		hasDetectedUsers &&
		!!recommendedPlan &&
		recommendedPlan.id !== currentPlan.id &&
		!needsUserCountSync;
	const showOutOfRange =
		hasDetectedUsers && userCount > 2000 && !needsUserCountSync;

	const plansForTeam = useMemo(() => {
		const ids = new Set<string>([
			FREE_PLAN.id,
			currentPlan.id,
			...eligiblePlans.map((plan) => plan.id),
		]);

		const plans = Array.from(ids)
			.map((id) => getPlan(id))
			.filter((plan): plan is SubscriptionPlan => !!plan);

		for (const plan of SUBSCRIPTION_PLANS) {
			if (plans.length >= 3) break;
			if (!ids.has(plan.id)) {
				plans.push(plan);
				ids.add(plan.id);
			}
		}

		return plans.slice(0, 3);
	}, [currentPlan.id, eligiblePlans]);

	return (
		<div className="space-y-6">
			{needsUserCountSync && (
				<div className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-background p-5">
					<span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#F4B183]" />
					<div className="min-w-0 flex-1">
						<h2 className="text-[15px] font-semibold">
							Connect an integration to detect users
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							We need a user count from Google Workspace,
							Dropbox or Slack before we can recommend the right
							plan.
						</p>
					</div>
					<Button
						variant="secondary"
						onClick={handleSyncUserCount}
						disabled={isSyncing}
						className="h-10 rounded-full px-4 text-sm font-semibold"
					>
						{isSyncing ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<RefreshCw className="size-4" />
						)}
						Sync now
					</Button>
				</div>
			)}

			{showTierMismatch && recommendedPlan && (
				<div className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-background p-5">
					<span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-lime" />
					<div className="min-w-0 flex-1">
						<h2 className="text-[15px] font-semibold">
							A different plan fits your team
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							We detected {userCount} users from{" "}
							{getSourceLabel(userCountSource)}.{" "}
							{recommendedPlan.name} is the best fit for{" "}
							{recommendedPlan.minUsers}-
							{recommendedPlan.maxUsers} users.
						</p>
					</div>
					<a
						href="#plans"
						className="inline-flex min-h-10 items-center rounded-full bg-muted px-4 text-sm font-semibold text-foreground transition-colors hover:bg-border"
					>
						Change plan
					</a>
				</div>
			)}

			{showOutOfRange && (
				<div className="flex flex-wrap items-start gap-4 rounded-2xl border border-border bg-background p-5">
					<span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-[#F4B183]" />
					<div className="min-w-0 flex-1">
						<h2 className="text-[15px] font-semibold">
							Your team is outside self-service range
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							Your workspace exceeds 2,000 users. Contact us for
							custom enterprise pricing.
						</p>
					</div>
					<a
						href="#plans"
						className="inline-flex min-h-10 items-center rounded-full bg-muted px-4 text-sm font-semibold text-foreground transition-colors hover:bg-border"
					>
						Review plans
					</a>
				</div>
			)}

			<div className="rounded-2xl border border-border bg-background p-6">
				<div className="flex flex-wrap items-start justify-between gap-5">
					<div className="flex items-start gap-4">
						<span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
							<Star className="size-5" fill="currentColor" />
						</span>
						<div>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="font-display text-[24px] font-semibold tracking-[-0.03em]">
									{currentPlan.name}
								</h2>
								<span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-paper">
									Active
								</span>
							</div>
							<p className="mt-1 text-[13px] text-muted-foreground">
								{billingLabel}
							</p>
						</div>
					</div>

					<div className="text-left sm:text-right">
						<p className="font-display text-[36px] font-semibold leading-none tracking-[-0.04em]">
							{currentPricing.price}
						</p>
						<p className="mt-1 text-[13px] text-muted-foreground">
							{currentPricing.period}
						</p>
					</div>
				</div>

				<p className="mt-4 max-w-2xl text-sm text-muted-foreground">
					{currentPlan.description}
				</p>

				<div className="mt-5 grid gap-3 sm:grid-cols-2">
					<InfoTile label="Subscription status">
						<span className="capitalize">
							{subscription?.status || "active"}
						</span>
					</InfoTile>
					<InfoTile label="Current period">
						{subscription?.currentPeriodStart &&
						subscription?.currentPeriodEnd
							? `${format(
									new Date(subscription.currentPeriodStart),
									"MMM d, yyyy"
								)} to ${format(
									new Date(subscription.currentPeriodEnd),
									"MMM d, yyyy"
								)}`
							: "No renewal date"}
					</InfoTile>
					<InfoTile label="Cancellation">
						{subscription?.cancelAtPeriodEnd
							? `Ends ${format(
									new Date(
										subscription.endsAt ||
											subscription.currentPeriodEnd
									),
									"MMM d, yyyy"
								)}`
							: "Not scheduled"}
					</InfoTile>
					<InfoTile label="Detected users">
						{hasDetectedUsers ? (
							<span className="flex flex-wrap items-center gap-2">
								{userCount}
								{userCountVerified ? (
									<span className="inline-flex items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-ink">
										<CircleCheck className="size-3" />
										Verified
									</span>
								) : (
									<button
										type="button"
										onClick={handleVerifyUserCount}
										className="text-[11px] font-semibold underline underline-offset-2"
									>
										Verify
									</button>
								)}
							</span>
						) : (
							"Not synced"
						)}
					</InfoTile>
				</div>

				<p className="mt-3 text-xs text-muted-foreground">
					{hasDetectedUsers
						? userCountSource
							? `Last synced from ${getSourceLabel(
									userCountSource
								)}${
									userCountLastSync
										? ` on ${format(
												userCountLastSync,
												"MMM d, yyyy"
											)}`
										: ""
								}.`
							: "Detected from your workspace data."
						: "Connect an integration to detect users in your workspace."}
				</p>

				<div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-xs font-medium text-muted-foreground">
							Plan interval
						</span>
						<div className="inline-flex rounded-full bg-muted p-1">
							{(["monthly", "yearly"] as BillingInterval[]).map(
								(interval) => (
									<button
										key={interval}
										type="button"
										onClick={() =>
											setSelectedInterval(interval)
										}
										className={`min-h-9 rounded-full px-4 text-[13px] font-semibold capitalize transition-colors ${
											displayInterval === interval
												? "bg-ink text-paper"
												: "text-muted-foreground hover:text-foreground"
										}`}
									>
										{interval}
									</button>
								)
							)}
						</div>
					</div>

					<div className="flex flex-wrap gap-2.5">
						{subscription && (
							<Button
								variant="outline"
								onClick={handleManageBilling}
								disabled={!isAdmin}
								className="h-11 rounded-full px-5 text-sm font-semibold"
							>
								<CreditCard className="size-4" />
								Manage Billing
							</Button>
						)}
						<Button
							onClick={handleUpgradeSubscription}
							disabled={
								!isAdmin ||
								isUpgrading ||
								!hasDetectedUsers ||
								eligiblePlans.length === 0 ||
								needsUserCountSync
							}
							className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
						>
							{isUpgrading && (
								<Loader2 className="size-4 animate-spin" />
							)}
							Change Plan
						</Button>
					</div>
				</div>

				{!isAdmin && (
					<p className="mt-4 rounded-xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">
						Only workspace admins can manage billing or change
						plans.
					</p>
				)}
			</div>

			<div className="rounded-2xl bg-night p-6 text-paper">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
							What&apos;s included
						</h2>
						<p className="mt-1 text-[13px] text-[#A8A8A2]">
							Everything in your {currentPlan.name} plan.
						</p>
					</div>
					<span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#A8A8A2]">
						6 features
					</span>
				</div>

				<div className="mt-5 grid gap-3 sm:grid-cols-2">
					{INCLUDED_FEATURES.map((feature) => (
						<div
							key={feature}
							className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3.5"
						>
							<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-lime text-ink">
								<Check className="size-3.5" strokeWidth={3} />
							</span>
							<span className="text-sm">{feature}</span>
						</div>
					))}
				</div>
			</div>

			<section id="plans" className="scroll-mt-24 space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
							Plans for your team size
						</h2>
						<p className="mt-1 text-[13px] text-muted-foreground">
							{hasDetectedUsers
								? `Based on ${userCount} detected users. Switch any time.`
								: "Sync your user count to see which plans fit your team."}
						</p>
					</div>
					{hasDetectedUsers && (
						<span className="rounded-full bg-muted px-3 py-1 text-[11px] font-semibold text-muted-foreground">
							{userCount} users detected
						</span>
					)}
				</div>

				<div className="grid gap-4 lg:grid-cols-3">
					{plansForTeam.map((plan) => {
						const isCurrent = plan.id === currentPlan.id;
						const isEligible = eligiblePlans.some(
							(eligiblePlan) => eligiblePlan.id === plan.id
						);
						const pricing = plan.plans[selectedInterval];

						let actionLabel = `Switch to ${plan.name}`;
						let actionDisabled =
							!isAdmin || isUpgrading || needsUserCountSync;
						let action: (() => void) | undefined =
							handleUpgradeSubscription;

						if (isCurrent) {
							actionLabel = "Current plan";
							actionDisabled = true;
							action = undefined;
						} else if (plan.id === "free") {
							actionLabel = subscription
								? "Downgrade in portal"
								: "Free plan";
							actionDisabled = !subscription || !isAdmin;
							action = subscription
								? handleManageBilling
								: undefined;
						} else if (!hasDetectedUsers) {
							actionLabel = "Sync users to switch";
							actionDisabled = true;
							action = undefined;
						} else if (!isEligible) {
							actionLabel = "Not available for your size";
							actionDisabled = true;
							action = undefined;
						}

						return (
							<article
								key={plan.id}
								className={`flex flex-col rounded-2xl border bg-background p-6 ${
									isCurrent
										? "border-ink"
										: "border-border"
								}`}
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<h3 className="font-display text-[20px] font-semibold tracking-[-0.02em]">
										{plan.name}
									</h3>
									{isCurrent ? (
										<span className="rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-ink">
											Current
										</span>
									) : plan.popular ? (
										<span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
											Popular
										</span>
									) : null}
								</div>

								<div className="mt-4 flex items-baseline gap-1">
									<span className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em]">
										{pricing.price}
									</span>
									<span className="text-[13px] text-muted-foreground">
										{pricing.period}
									</span>
								</div>
								<p className="mt-1 text-[12px] text-muted-foreground">
									{plan.id === "free"
										? "Up to 2,500 users"
										: `${plan.minUsers}-${plan.maxUsers} users`}
								</p>
								<p className="mt-4 text-[13px] text-muted-foreground">
									{plan.description}
								</p>

								<ul className="mt-4 flex-1 space-y-2.5">
									{plan.features.slice(0, 3).map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-2 text-[13px]"
										>
											<span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-muted">
												<Check className="size-2.5" />
											</span>
											{feature}
										</li>
									))}
								</ul>

								<button
									type="button"
									onClick={action}
									disabled={actionDisabled}
									className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
										actionDisabled
											? "bg-muted text-muted-foreground"
											: "bg-ink text-paper hover:bg-ink/90"
									}`}
								>
									{actionLabel}
								</button>
							</article>
						);
					})}
				</div>
			</section>

			<div
				className={
					currentPlan.id !== "free"
						? "grid gap-4 md:grid-cols-2"
						: "grid gap-4"
				}
			>
				{currentPlan.id !== "free" && (
					<div className="rounded-2xl bg-lime p-6 text-ink">
						<div className="flex items-start gap-4">
							<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-lime">
								<Sparkles className="size-5" />
							</span>
							<div>
								<h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">
									Founders Circle pricing lock
								</h2>
								<p className="mt-1.5 text-[13px]">
									Your price is locked forever. You&apos;re
									grandfathered in even after we move to
									per-user pricing.
								</p>
								<span className="mt-3 inline-flex rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-lime">
									Locked forever
								</span>
							</div>
						</div>
					</div>
				)}

				<div className="rounded-2xl border border-border bg-background p-6">
					<div className="flex items-start gap-4">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
							<ShieldCheck className="size-5" />
						</span>
						<div>
							<h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">
								30-day safety net
							</h2>
							<p className="mt-1.5 text-[13px] text-muted-foreground">
								Every cleanup action can be reversed within 30
								days. Archived files stay recoverable with one
								click.
							</p>
						</div>
					</div>
				</div>
			</div>

			{!activeOrganization && (
				<div className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
					<Users className="size-4 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						Select a workspace to view billing details.
					</p>
				</div>
			)}
		</div>
	);
}
