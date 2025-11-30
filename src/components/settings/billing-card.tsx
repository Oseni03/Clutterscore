"use client";

import React, { useEffect } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";

function BillingCard() {
	const { activeOrganization, subscription, loadSubscription } =
		useOrganizationStore((state) => state);

	useEffect(() => {
		if (activeOrganization?.id) {
			// load latest subscription from API if not present
			loadSubscription(activeOrganization.id).catch((err) => {
				console.error("Failed to load subscription:", err);
			});
		}
	}, [activeOrganization?.id, loadSubscription]);

	return (
		<>
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Current Plan</CardTitle>
						<CardDescription>
							You are on the Pro Plan
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-baseline gap-2">
							<span className="text-3xl font-bold">$290</span>
							<span className="text-muted-foreground">/year</span>
						</div>
						{subscription && (
							<div className="text-sm text-muted-foreground">
								${(subscription.amount / 100).toFixed(2)}/
								{subscription.currency.toLowerCase()} -{" "}
								{subscription.status}
							</div>
						)}
						<div className="text-sm text-muted-foreground">
							Includes 50 users and unlimited automated cleanups.
						</div>
						<Separator />
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>Users</span>
								<span className="font-medium">42 / 50</span>
							</div>
							<div className="h-2 bg-secondary rounded-full overflow-hidden">
								<div className="h-full bg-primary w-[84%]" />
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<Button className="w-full">Upgrade Plan</Button>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Payment Method</CardTitle>
						<CardDescription>
							Manage your billing details
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-4 p-4 border rounded-lg">
							<div className="h-10 w-14 bg-muted rounded flex items-center justify-center">
								<CreditCard className="h-6 w-6" />
							</div>
							<div>
								<div className="font-medium">
									Visa ending in 4242
								</div>
								<div className="text-sm text-muted-foreground">
									Expires 12/2026
								</div>
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<Button variant="outline" className="w-full">
							Update Payment Method
						</Button>
					</CardFooter>
				</Card>
			</div>

			{/* <Card>
				<CardHeader>
					<CardTitle>Invoice History</CardTitle>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : invoices.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								No invoices found
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{invoices.map((invoice) => (
								<div
									key={invoice.id}
									className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
								>
									<div className="flex items-center gap-4">
										<div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
											<Receipt className="h-4 w-4 text-muted-foreground" />
										</div>
										<div>
											<div className="font-medium text-sm">
												{invoice.id}
											</div>
											<div className="text-xs text-muted-foreground">
												{invoice.date}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm font-medium">
											{invoice.amount}
										</span>
										<Badge
											variant="outline"
											className="text-emerald-600 border-emerald-200 bg-emerald-50"
										>
											{invoice.status}
										</Badge>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
										>
											<Download className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card> */}
		</>
	);
}

export default BillingCard;
