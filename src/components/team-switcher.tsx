"use client";

import * as React from "react";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { CreateOrganizationForm } from "./forms/create-organization-form";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { getPlanByTier } from "@/lib/subscription-plans";
import { Member } from "@/types";
import { Organization } from "@prisma/client";
import Logo from "./logo";
import { logger } from "@/lib/logger";

export function TeamSwitcher() {
	const { isMobile } = useSidebar();
	const { data: session } = authClient.useSession();
	const {
		organizations,
		activeOrganization,
		setAdmin,
		setOrganizationData,
		loadSubscription,
	} = useOrganizationStore((state) => state);
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const handleChangeOrganization = async (organizationId: string) => {
		try {
			const { error, data } = await authClient.organization.setActive({
				organizationId,
			});

			if (error) {
				logger.error("Error changing active org:", error);
				toast.error("Failed to switch organization");
				return;
			}

			const isAdmin = !!data?.members?.find(
				(member) =>
					member.userId == session?.user?.id && member.role == "admin"
			);

			if (!error && data) {
				// Use the sync function to update state
				setOrganizationData(
					data as Organization,
					(data?.members as Member[]) || [],
					data?.invitations || []
				);
				loadSubscription(data.id);
				setAdmin(isAdmin);
			}

			toast.success("Organization switched successfully");
		} catch (error) {
			logger.error("Failed to switch organization:", error);
			toast.error("Failed to switch organization");
		}
	};

	React.useEffect(() => {
		if (!activeOrganization && organizations && organizations?.length > 0) {
			handleChangeOrganization(organizations[0].id);
		}
	}, [activeOrganization, organizations]);

	const plan = getPlanByTier(activeOrganization?.subscriptionTier || "free");

	return (
		<Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<Logo />
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{activeOrganization?.name}
									</span>
									<span className="truncate text-xs">
										{plan ? `${plan.name}` : "Free"}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
							align="start"
							side={isMobile ? "bottom" : "right"}
							sideOffset={4}
						>
							<DropdownMenuLabel className="text-muted-foreground text-xs">
								Workspaces
							</DropdownMenuLabel>
							{organizations?.map((org, index) => (
								<DropdownMenuItem
									key={org.name}
									onClick={() =>
										handleChangeOrganization(org.id)
									}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-md border">
										<Building2 className="size-3.5 shrink-0" />
									</div>
									{org.name}
									<DropdownMenuShortcut>
										⌘{index + 1}
									</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 p-2"
								onClick={() => setDialogOpen(true)}
							>
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<Plus className="size-4" />
								</div>
								<div className="text-muted-foreground font-medium">
									Add Workspace
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Dialog Content */}
					<DialogContent showCloseButton={true}>
						<DialogHeader>
							<DialogTitle>Create Tenanat</DialogTitle>
							<DialogDescription>
								Create a new workspace to get started.
							</DialogDescription>
						</DialogHeader>
						<CreateOrganizationForm />
					</DialogContent>
				</SidebarMenuItem>
			</SidebarMenu>
		</Dialog>
	);
}
