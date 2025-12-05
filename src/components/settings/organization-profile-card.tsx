"use client";

import React from "react";
import {
	Building2,
	Edit,
	Trash2,
	Calendar,
	Link as LinkIcon,
	Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Organization } from "@prisma/client";

interface OrganizationProfileCardProps {
	organization: Organization;
	isAdmin: boolean;
	onEdit: () => void;
	onDelete: () => void;
	subscriptionBadge: {
		variant: "secondary" | "default";
		text: string;
		className?: string;
	};
	PlanIcon: React.ElementType;
}

export function OrganizationProfileCard({
	organization,
	isAdmin,
	onEdit,
	onDelete,
	subscriptionBadge,
	PlanIcon,
}: OrganizationProfileCardProps) {
	const formattedDate = format(
		new Date(organization.createdAt),
		"MMM d, yyyy"
	);

	return (
		<Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
			{/* Header with gradient */}
			<div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background h-32">
				<div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
				{isAdmin && (
					<div className="absolute top-4 right-4 flex gap-2">
						<Button
							variant="secondary"
							size="icon"
							className="h-9 w-9 bg-background/80 backdrop-blur-sm hover:bg-background"
							onClick={onEdit}
							aria-label="Edit workspace"
						>
							<Edit className="w-4 h-4" />
						</Button>
						<Button
							variant="secondary"
							size="icon"
							className="h-9 w-9 bg-background/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600"
							onClick={onDelete}
							aria-label="Delete workspace"
						>
							<Trash2 className="w-4 h-4" />
						</Button>
					</div>
				)}
			</div>

			<CardContent className="p-6 -mt-8 space-y-6">
				{/* Organization icon and name */}
				<div className="flex items-start gap-4">
					<div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center ring-4 ring-background shadow-sm">
						<Building2 className="w-8 h-8 text-primary" />
					</div>
					<div className="flex-1 min-w-0 pt-2">
						<h3 className="text-2xl font-bold tracking-tight truncate">
							{organization.name}
						</h3>
						<div className="flex items-center gap-2 mt-1">
							<Badge
								className={cn(
									"capitalize font-medium",
									subscriptionBadge.className ||
										"bg-secondary text-secondary-foreground"
								)}
								variant={subscriptionBadge.variant}
							>
								<PlanIcon className="w-3 h-3 mr-1" />
								{subscriptionBadge.text}
							</Badge>
						</div>
					</div>
				</div>

				<Separator />

				{/* Details grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{/* Slug */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<LinkIcon className="w-4 h-4" />
							<span className="font-medium">Workspace URL</span>
						</div>
						<div className="flex items-center gap-2">
							<code className="text-sm font-mono bg-muted px-2 py-1 rounded">
								{organization.slug}
							</code>
						</div>
					</div>

					{/* Target Score */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Target className="w-4 h-4" />
							<span className="font-medium">Target Score</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-2xl font-bold text-primary">
								{organization.targetScore || 75}
							</span>
							<span className="text-sm text-muted-foreground">
								/100
							</span>
						</div>
					</div>

					{/* Created date */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Calendar className="w-4 h-4" />
							<span className="font-medium">Created</span>
						</div>
						<p className="text-base font-medium">{formattedDate}</p>
					</div>
				</div>

				{/* Stats bar */}
				<div className="pt-4 border-t">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							Workspace ID
						</span>
						<code className="text-xs font-mono bg-muted px-2 py-1 rounded">
							{organization.id.slice(0, 8)}...
						</code>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
