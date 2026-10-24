"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";

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

	const handleChangeOrganization = React.useCallback(
		async (organizationId: string) => {
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
						member.userId == session?.user?.id &&
						member.role == "admin"
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
		},
		[session?.user?.id, setAdmin, setOrganizationData, loadSubscription]
	);

	React.useEffect(() => {
		if (!activeOrganization && organizations && organizations?.length > 0) {
			handleChangeOrganization(organizations[0].id);
		}
	}, [activeOrganization, organizations, handleChangeOrganization]);

	const plan = getPlanByTier(activeOrganization?.subscriptionTier || "free");
	const workspaceInitial =
		activeOrganization?.name?.charAt(0).toUpperCase() || "C";

	return (
		<Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="h-12 rounded-md bg-muted px-2.5 hover:bg-border data-[state=open]:bg-border"
							>
								<span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-ink text-sm font-semibold text-paper">
									{workspaceInitial}
								</span>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{activeOrganization?.name}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{plan ? `${plan.name} plan` : "Free plan"}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto size-4" />
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
									<div className="flex size-6 items-center justify-center rounded-sm bg-ink text-[11px] font-semibold text-paper">
										{org.name.charAt(0).toUpperCase()}
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
									Create workspace
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Dialog Content */}
					<DialogContent showCloseButton={true}>
						<DialogHeader>
							<DialogTitle>Create workspace</DialogTitle>
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
