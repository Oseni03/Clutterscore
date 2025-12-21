"use client";

import { useOrganization } from "@/hooks/use-organization";
import { getPlanByTier } from "@/lib/subscription-plans";
import { Building2, Crown, Sparkles } from "lucide-react";
import { OrganizationSkeleton } from "@/components/settings/organization-skeleton";
import { OrganizationProfileCard } from "@/components/settings/organization-profile-card";
import { SubscriptionDetailsCard } from "@/components/settings/subscription-details-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { OrganizationDialogs } from "@/components/settings/organization-dialogs";

const getPlanIcon = (tier: string) => {
	if (!tier) return Building2;

	switch (tier.toLowerCase()) {
		case "pro":
			return Sparkles;
		case "enterprise":
			return Crown;
		default:
			return Building2;
	}
};

const getSubscriptionBadge = (planTier: string) => {
	const badges = {
		FREE: {
			variant: "secondary" as const,
			text: "Free Tier",
			className: "",
		},
		PRO: {
			variant: "default" as const,
			text: "Pro Plan",
			className: "",
		},
		ENTERPRISE: {
			variant: "default" as const,
			text: "Exterprise Plan",
			className:
				"bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0",
		},
	};

	return (
		badges[planTier as keyof typeof badges] || {
			variant: "secondary" as const,
			text: planTier,
			className: "",
		}
	);
};

export default function WorkspacePage() {
	const {
		activeOrganization,
		isAdmin,
		deleteDialogOpen,
		resetDialogOpen,
		updateDialogOpen,
		isLoading,
		setDeleteDialogOpen,
		setResetDialogOpen,
		setUpdateDialogOpen,
		handleDeleteConfirm,
		handleOpenDeleteDialog,
		handleResetData,
		handleOpenUpdateDialog,
	} = useOrganization();

	if (!activeOrganization) {
		return <OrganizationSkeleton />;
	}

	const planTier = activeOrganization?.subscriptionTier || "FREE";
	const plan = getPlanByTier(planTier);
	const PlanIcon = getPlanIcon(planTier);
	const subscriptionBadge = getSubscriptionBadge(planTier);

	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-6xl p-6 space-y-6">
				<div className="mb-8">
					<h1 className="text-2xl font-display font-bold">
						Workspace Settings
					</h1>
					<p className="text-muted-foreground">
						Manage your workspace details and preferences.
					</p>
				</div>

				<div className="space-y-6">
					{/* Organization Profile */}
					<OrganizationProfileCard
						organization={activeOrganization}
						isAdmin={isAdmin}
						onEdit={handleOpenUpdateDialog}
						onDelete={handleOpenDeleteDialog}
						subscriptionBadge={subscriptionBadge}
						PlanIcon={PlanIcon}
					/>

					{/* Subscription Details */}
					<SubscriptionDetailsCard
						subscriptionBadge={subscriptionBadge}
						planFeatures={plan?.features}
					/>

					{/* Danger Zone */}
					{isAdmin && (
						<DangerZoneCard
							onResetData={() => setResetDialogOpen(true)}
							onDeleteOrganization={handleOpenDeleteDialog}
						/>
					)}

					{/* All Dialogs */}
					<OrganizationDialogs
						organization={activeOrganization}
						updateDialogOpen={updateDialogOpen}
						resetDialogOpen={resetDialogOpen}
						deleteDialogOpen={deleteDialogOpen}
						isLoading={isLoading}
						onUpdateDialogChange={setUpdateDialogOpen}
						onResetDialogChange={setResetDialogOpen}
						onDeleteDialogChange={setDeleteDialogOpen}
						onResetConfirm={handleResetData}
						onDeleteConfirm={handleDeleteConfirm}
					/>
				</div>
			</div>
		</div>
	);
}
