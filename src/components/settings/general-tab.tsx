"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, Shield, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { UpdateOrganizationForm } from "../forms/update-organization-form";
import { Organization } from "@/types";
import { getPlanByProductId } from "@/lib/utils";

export default function GeneralTab() {
	const { activeOrganization, isAdmin, isLoading } = useOrganizationStore(
		(state) => ({
			activeOrganization: state.activeOrganization,
			isAdmin: state.isAdmin,
			isLoading: state.isLoading,
			updateOrganization: state.updateOrganization,
		})
	);

	const [editOpen, setEditOpen] = useState(false);

	if (isLoading || !activeOrganization) {
		return (
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<Skeleton className="h-7 w-48" />
					</CardHeader>
					<CardContent className="space-y-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	const plan = getPlanByProductId(
		activeOrganization.subscription?.productId || ""
	);

	const subscriptionBadge = {
		FREE: { variant: "secondary" as const, text: "Free Tier" },
		AUDIT: { variant: "default" as const, text: "Audit Plan" },
		PRO: {
			variant: "default" as const,
			text: "Pro Plan",
			className: "bg-emerald-500",
		},
	}[plan?.id.toUpperCase() || "FREE"]!;

	return (
		<div className="space-y-8">
			{/* Organization Info */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div className="flex items-center gap-3">
						<Building2 className="w-6 h-6 text-primary" />
						<CardTitle>Organization Profile</CardTitle>
					</div>
					{isAdmin && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setEditOpen(true);
							}}
						>
							Edit Name
						</Button>
					)}
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-6 sm:grid-cols-2">
						<div className="space-y-2">
							<Label className="text-muted-foreground">
								Organization Name
							</Label>
							<p className="text-lg font-medium">
								{activeOrganization.name}
							</p>
						</div>

						<div className="space-y-2">
							<Label className="text-muted-foreground">
								Subscription Plan
							</Label>
							<Badge
								variant={subscriptionBadge.variant}
								className={subscriptionBadge.className}
							>
								<Shield className="w-3 h-3 mr-1" />
								{subscriptionBadge.text}
							</Badge>
						</div>

						<div className="space-y-2">
							<Label className="text-muted-foreground flex items-center gap-2">
								<Calendar className="w-4 h-4" />
								Created On
							</Label>
							<p className="text-lg font-medium">
								{format(
									new Date(activeOrganization.createdAt),
									"MMMM d, yyyy"
								)}
							</p>
						</div>

						<div className="space-y-2">
							<Label className="text-muted-foreground">
								Target Cleanliness Score
							</Label>
							<div className="flex items-center gap-3">
								<span className="text-2xl font-bold text-primary">
									100%
								</span>
								<span className="text-sm text-muted-foreground">
									(Goal for digital hygiene)
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			{isAdmin && (
				<Card className="border-destructive/50 bg-destructive/5">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="w-5 h-5" />
							Danger Zone
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/10">
							<div className="max-w-2xl">
								<h4 className="font-semibold text-foreground">
									Reset All Data
								</h4>
								<p className="text-sm text-muted-foreground mt-1">
									This will permanently delete all audit
									history, playbooks, files, integrations, and
									reset your Clutterscore to zero. This action
									cannot be undone.
								</p>
							</div>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm">
										Reset All Data
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Are you absolutely sure?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will permanently delete{" "}
											<strong>all data</strong> for{" "}
											<strong>
												{activeOrganization.name}
											</strong>
											:
											<br />
											• Audit results & trends
											<br />
											• Playbooks & execution history
											<br />
											• Files, integrations, and settings
											<br />
											<br />
											Your organization will remain, but
											all progress will be lost.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>
											Cancel
										</AlertDialogCancel>
										<AlertDialogAction className="bg-destructive hover:bg-destructive/90">
											Yes, Reset Everything
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit Name Dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Organization Name</DialogTitle>
						<DialogDescription>
							Change the display name for your Clutterscore
							workspace.
						</DialogDescription>
					</DialogHeader>
					<UpdateOrganizationForm
						organization={activeOrganization as Organization}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
