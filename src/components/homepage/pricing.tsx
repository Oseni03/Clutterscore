// components/pricing.tsx
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { CheckCircle2, Users } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	SUBSCRIPTION_PLANS,
	type BillingInterval,
} from "@/lib/subscription-plans";
import { Badge } from "../ui/badge";

function Pricing() {
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("yearly");

	const plans = SUBSCRIPTION_PLANS.map((plan) => ({
		...plan,
		tagline:
			plan.id === "free"
				? "Audit-Only Access"
				: plan.id === "enterprise"
					? "Unlimited Scale"
					: `${plan.minUsers}–${plan.maxUsers} Users`,
		cta:
			plan.id === "free"
				? "Start Free Audit"
				: plan.id === "enterprise"
					? "Contact Sales"
					: "Upgrade to Pro",
		ctaVariant: plan.popular
			? "default"
			: ("outline" as
					| "default"
					| "outline"
					| "link"
					| "destructive"
					| "secondary"
					| "ghost"
					| null
					| undefined),
	}));

	return (
		<section className="py-32 bg-muted/40" id="pricing">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-3xl mx-auto mb-12">
					<Badge variant="accent" className="mb-4">
						Founders Circle Pricing
					</Badge>
					<h2 className="text-3xl md:text-h2 font-display font-semibold mb-6">
						Fixed tiers. No per-seat chaos.
					</h2>
					<p className="text-lead text-muted-foreground mb-8">
						Pricing locked for the first 50 customers. Choose the
						tier that matches your team size.
					</p>

					{/* Billing Interval Toggle */}
					<div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
						<Button
							variant="ghost"
							onClick={() => setBillingInterval("monthly")}
							className={cn(
								"h-10 px-5 rounded-full text-sm font-medium transition-colors",
								billingInterval === "monthly"
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: "text-muted-foreground hover:bg-transparent hover:text-foreground"
							)}
						>
							Monthly
						</Button>
						<Button
							variant="ghost"
							onClick={() => setBillingInterval("yearly")}
							className={cn(
								"h-10 px-5 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
								billingInterval === "yearly"
									? "bg-primary text-primary-foreground hover:bg-primary/90"
									: "text-muted-foreground hover:bg-transparent hover:text-foreground"
							)}
						>
							Annual Pre-Pay
							<Badge
								variant="secondary"
								className={cn(
									"border-0 text-xs",
									billingInterval === "yearly"
										? "bg-primary-foreground/15 text-primary-foreground"
										: "bg-foreground/10 text-foreground"
								)}
							>
								Required
							</Badge>
						</Button>
					</div>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
					{plans.map((plan) => {
						const pricing = plan.plans[billingInterval];
						const isPopular = plan.popular;

						return (
							<Card
								key={plan.id}
								className={cn(
									"flex flex-col relative overflow-hidden transition-all",
									isPopular
										? "border border-foreground scale-105 lg:scale-110"
										: "border border-transparent"
								)}
							>
								{isPopular && (
									<div className="absolute top-0 right-0 bg-lime text-ink text-xs font-semibold px-3 py-1 rounded-bl-md">
										POPULAR
									</div>
								)}
								<CardHeader>
									<div className="flex items-center gap-2 mb-2">
										<plan.icon className="h-5 w-5 text-foreground" />
										<h3 className="text-xl font-display font-semibold">
											{plan.name}
										</h3>
									</div>
									{plan.id !== "free" &&
										plan.id !== "enterprise" && (
											<div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
												<Users className="h-3 w-3" />
												<span>
													{plan.minUsers}-
													{plan.maxUsers} users
												</span>
											</div>
										)}
									<p className="text-muted-foreground text-sm">
										{plan.tagline}
									</p>
									<div className="mt-6">
										<div className="flex items-baseline gap-1">
											<span className="text-3xl font-display font-semibold">
												{pricing.price}
											</span>
											<span className="text-muted-foreground text-xs">
												{pricing.period}
											</span>
										</div>
										{pricing.savings && (
											<Badge
												variant="secondary"
												className="mt-2 text-xs"
											>
												{pricing.savings}
											</Badge>
										)}
									</div>
								</CardHeader>
								<CardContent className="flex-1">
									<ul className="space-y-2">
										{plan.features
											.slice(0, 6)
											.map((feature, i) => (
												<li
													key={i}
													className="flex items-start gap-2"
												>
													<CheckCircle2
														className={cn(
															"h-4 w-4 mt-0.5 flex-shrink-0",
															isPopular
																? "text-foreground"
																: "text-muted-foreground"
														)}
													/>
													<span className="text-xs">
														{feature}
													</span>
												</li>
											))}
										{plan.features.length > 6 && (
											<li className="text-xs text-muted-foreground pl-6">
												+{plan.features.length - 6} more
												features
											</li>
										)}
									</ul>
								</CardContent>
								<div className="p-6 pt-0">
									<Link
										href={
											plan.id === "free"
												? "/signup"
												: plan.id === "enterprise"
													? "/contact-sales"
													: "/dashboard/settings/billing"
										}
										className={cn(
											buttonVariants({
												variant: plan.ctaVariant,
											}),
											"w-full text-sm",
											isPopular &&
												"bg-primary hover:bg-primary/90"
										)}
									>
										{plan.cta}
									</Link>
								</div>
							</Card>
						);
					})}
				</div>
				{/* Info Banner */}
				<div className="mt-12 text-center max-w-2xl mx-auto">
					<Card className="bg-lime">
						<CardContent className="pt-6">
							<p className="text-sm font-medium mb-2 text-ink">
								🚀 Automatic Tier Detection
							</p>
							<p className="text-xs text-ink/70">
								Connect Google Workspace, Dropbox, or Slack and
								we&apos;ll automatically recommend the right
								tier for your team size.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}

export default Pricing;
