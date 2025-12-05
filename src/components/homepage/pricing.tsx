import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "../ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

function Pricing() {
	return (
		<section className="py-32 bg-secondary/20" id="pricing">
			<div className="container mx-auto px-4">
				<div className="text-center max-w-3xl mx-auto mb-20">
					<h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
						Simple, predictable pricing.
					</h2>
					<p className="text-xl text-muted-foreground">
						No per-seat pricing. Companies love predictable cost.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
					{/* Free Tier */}
					<Card className="border-border/60 flex flex-col">
						<CardHeader>
							<h3 className="text-2xl font-display font-bold">
								Free
							</h3>
							<p className="text-muted-foreground">
								Viral Engine
							</p>
							<div className="mt-4">
								<span className="text-4xl font-bold">$0</span>
								<span className="text-muted-foreground">
									/forever
								</span>
							</div>
						</CardHeader>
						<CardContent className="flex-1">
							<ul className="space-y-3">
								{[
									"Full Audit + Clutterscore",
									"PDF Report Export",
									"Watermark on reports",
									"Unlimited scans",
								].map((item, i) => (
									<li
										key={i}
										className="flex items-center gap-2"
									>
										<CheckCircle2 className="h-5 w-5 text-muted-foreground" />
										<span className="text-sm">{item}</span>
									</li>
								))}
							</ul>
						</CardContent>
						<div className="p-6 pt-0">
							<Link
								href={"/dashboard"}
								className={cn(
									buttonVariants({ variant: "outline" }),
									"w-full"
								)}
							>
								Start Free Audit
							</Link>
						</div>
					</Card>

					{/* Pro Tier */}
					<Card className="border-primary shadow-lg flex flex-col relative overflow-hidden">
						<div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
							POPULAR
						</div>
						<CardHeader>
							<h3 className="text-2xl font-display font-bold">
								Pro
							</h3>
							<p className="text-muted-foreground">
								Automated Cleanup
							</p>
							<div className="mt-4">
								<span className="text-4xl font-bold">$29</span>
								<span className="text-muted-foreground">
									/mo per 50 users
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-1">
								Billed annually ($290)
							</p>
						</CardHeader>
						<CardContent className="flex-1">
							<ul className="space-y-3">
								{[
									"Everything in Free",
									"Automated Cleanups",
									"Full Dashboard Access",
									"Savings Tracker",
									"No Watermark",
								].map((item, i) => (
									<li
										key={i}
										className="flex items-center gap-2"
									>
										<CheckCircle2 className="h-5 w-5 text-primary" />
										<span className="text-sm font-medium">
											{item}
										</span>
									</li>
								))}
							</ul>
						</CardContent>
						<div className="p-6 pt-0">
							<Link
								href={"/dashboard"}
								className={cn(
									buttonVariants({ variant: "outline" }),
									"w-full"
								)}
							>
								Get Started
							</Link>
						</div>
					</Card>

					{/* Enterprise Tier */}
					<Card className="border-border/60 flex flex-col">
						<CardHeader>
							<h3 className="text-2xl font-display font-bold">
								Enterprise
							</h3>
							<p className="text-muted-foreground">
								Expert Review
							</p>
							<div className="mt-4">
								<span className="text-4xl font-bold">$99</span>
								<span className="text-muted-foreground">
									/mo per 50 users
								</span>
							</div>
						</CardHeader>
						<CardContent className="flex-1">
							<ul className="space-y-3">
								{[
									"Everything in Pro",
									"Quarterly Human Expert Review",
									"Priority Support",
									"Custom Playbooks",
									"SLA Guarantee",
								].map((item, i) => (
									<li
										key={i}
										className="flex items-center gap-2"
									>
										<CheckCircle2 className="h-5 w-5 text-muted-foreground" />
										<span className="text-sm">{item}</span>
									</li>
								))}
							</ul>
						</CardContent>
						<div className="p-6 pt-0">
							<Link
								href={"/dashboard"}
								className={cn(
									buttonVariants({ variant: "outline" }),
									"w-full"
								)}
							>
								Contact Sales
							</Link>
						</div>
					</Card>
				</div>
			</div>
		</section>
	);
}

export default Pricing;
