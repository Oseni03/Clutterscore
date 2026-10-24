"use client";

import { toast } from "sonner";
import { useOrganization } from "@/hooks/use-organization";
import { getPlanByTier } from "@/lib/subscription-plans";
import { SettingsHeader } from "@/components/settings/settings-header";
import { OrganizationSkeleton } from "@/components/settings/organization-skeleton";
import { OrganizationProfileCard } from "@/components/settings/organization-profile-card";
import { SubscriptionDetailsCard } from "@/components/settings/subscription-details-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";
import { OrganizationDialogs } from "@/components/settings/organization-dialogs";

export default function WorkspacePage() {
	const {
		activeOrganization,
		members,
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

	const planTier = activeOrganization?.subscriptionTier || "free";
	const plan = getPlanByTier(planTier);
	const isFree = plan.id === "free";
	const planLabel = isFree ? "Free" : plan.name;

	const handleChangeLogo = () => {
		toast.info("Logo uploads are not available yet.", {
			description: "This workspace currently uses its name initial.",
		});
	};

	return (
		<div className="space-y-6 p-6 md:p-8">
			<SettingsHeader />

			{!activeOrganization ? (
				<OrganizationSkeleton />
			) : (
				<>
					<OrganizationProfileCard
						organization={activeOrganization}
						isAdmin={isAdmin}
						memberCount={members.length}
						planLabel={planLabel}
						onEdit={handleOpenUpdateDialog}
						onChangeLogo={handleChangeLogo}
					/>

					<SubscriptionDetailsCard
						planLabel={planLabel}
						isFree={isFree}
					/>

					{isAdmin && (
						<DangerZoneCard
							onResetData={() => setResetDialogOpen(true)}
							onDeleteOrganization={handleOpenDeleteDialog}
						/>
					)}

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
				</>
			)}
		</div>
	);
}
