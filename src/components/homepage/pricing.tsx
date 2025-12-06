"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SUBSCRIPTION_PLANS, type BillingInterval } from "@/lib/utils";
import { Badge } from "../ui/badge";

function Pricing() {
	const [billingInterval, setBillingInterval] =
		useState<BillingInterval>("yearly");

	const plans = [
		{
			...SUBSCRIPTION_PLANS[0], // Free
			tagline: "Read-Only Insights",
			cta: "Start Free Audit",
			ctaVariant: "outline" as const,
		},
		{
			...SUBSCRIPTION_PLANS[1], // Pro
			tagline: "Full Automation",
			cta: "Get Started",
			ctaVariant: "default" as const,
		},
		{
			...SUBSCRIPTION_PLANS[2], // Enterprise
			tagline: "Advanced Management",
			cta: "Contact Sales",
			ctaVariant: "outline" as const,
		},
	];

	return (
		<section className="py-32 bg-secondary/20" id="pricing">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-3xl mx-auto mb-12">
					<h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
						Simple, predictable pricing.
					</h2>
					<p className="text-xl text-muted-foreground mb-8">
						No per-seat pricing. Companies love predictable cost.
					</p>

					{/* Billing Interval Toggle */}
					<div className="inline-flex items-center gap-3 p-1 bg-secondary rounded-lg">
						<Button
							onClick={() => setBillingInterval("monthly")}
							className={cn(
								"px-6 py-2 rounded-md text-sm font-medium transition-all",
								billingInterval === "monthly"
									? "bg-background shadow-sm text-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							Monthly
						</Button>
						<Button
							onClick={() => setBillingInterval("yearly")}
							className={cn(
								"px-6 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
								billingInterval === "yearly"
									? "bg-background shadow-sm text-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							Yearly
							<Badge
								variant="secondary"
								className="bg-primary/10 text-primary border-0 text-xs"
							>
								Save 17%
							</Badge>
						</Button>
					</div>
				</div>

				<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
					{plans.map((plan) => {
						const pricing = plan.plans[billingInterval];
						const isPopular = plan.popular;

						return (
							<Card
								key={plan.id}
								className={cn(
									"flex flex-col relative overflow-hidden transition-all hover:shadow-lg",
									isPopular
										? "border-primary shadow-lg scale-105"
										: "border-border/60"
								)}
							>
								{isPopular && (
									<div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
										POPULAR
									</div>
								)}
								<CardHeader>
									<div className="flex items-center gap-2 mb-2">
										<plan.icon className="h-5 w-5 text-primary" />
										<h3 className="text-2xl font-display font-bold">
											{plan.name}
										</h3>
									</div>
									<p className="text-muted-foreground text-sm">
										{plan.tagline}
									</p>
									<div className="mt-6">
										<div className="flex items-baseline gap-1">
											<span className="text-4xl font-bold">
												{pricing.price}
											</span>
											<span className="text-muted-foreground text-sm">
												{pricing.period}
											</span>
										</div>
										{billingInterval === "yearly" &&
											plan.id !== "free" &&
											pricing.savings && (
												<p className="text-xs text-primary font-medium mt-1">
													{pricing.savings}
												</p>
											)}
										{plan.id === "pro" &&
											billingInterval === "monthly" && (
												<p className="text-xs text-muted-foreground mt-1">
													or $150/year (save 17%)
												</p>
											)}
									</div>
								</CardHeader>
								<CardContent className="flex-1">
									<ul className="space-y-3">
										{plan.features.map((feature, i) => (
											<li
												key={i}
												className="flex items-start gap-2"
											>
												<CheckCircle2
													className={cn(
														"h-5 w-5 mt-0.5 flex-shrink-0",
														isPopular
															? "text-primary"
															: "text-muted-foreground"
													)}
												/>
												<span
													className={cn(
														"text-sm",
														isPopular &&
															"font-medium"
													)}
												>
													{feature}
												</span>
											</li>
										))}
									</ul>
								</CardContent>
								<div className="p-6 pt-0">
									<Link
										href={"/dashboard/settings/billing"}
										className={cn(
											buttonVariants({
												variant: plan.ctaVariant,
											}),
											"w-full",
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
			</div>
		</section>
	);
}

export default Pricing;
