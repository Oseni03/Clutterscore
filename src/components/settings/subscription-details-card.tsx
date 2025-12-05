"use client";

import React from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SubscriptionDetailsCardProps {
	subscriptionBadge: {
		variant: "secondary" | "default";
		text: string;
		className?: string;
	};
	planFeatures?: string[];
}

export function SubscriptionDetailsCard({
	subscriptionBadge,
	planFeatures,
}: SubscriptionDetailsCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<Shield className="w-6 h-6 text-primary" />
					<CardTitle>Subscription Details</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label className="text-muted-foreground">
							Current Plan
						</Label>
						<div className="flex items-center gap-2">
							<Badge
								className={cn(
									"capitalize font-medium",
									subscriptionBadge.className
								)}
								variant={subscriptionBadge.variant}
							>
								<Shield className="w-3 h-3 mr-1" />
								{subscriptionBadge.text}
							</Badge>
						</div>
					</div>

					<div className="space-y-2">
						<Label className="text-muted-foreground">
							Plan Features
						</Label>
						<p className="text-sm text-foreground">
							{planFeatures?.join(", ") ||
								"Basic features included"}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
