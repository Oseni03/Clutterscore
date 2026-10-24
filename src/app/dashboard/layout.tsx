// Layout page
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { Member } from "@/types";
import { DashboardStoreProvider } from "@/zustand/providers/dashboard-store-provider";
import { getOrganizations } from "@/server/organizations";
import { Organization } from "@prisma/client";
import { toast } from "sonner";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

const ROUTE_LABELS = [
	{ prefix: "/dashboard/playbooks", label: "Playbooks" },
	{ prefix: "/dashboard/audit-logs", label: "Audit logs" },
	{ prefix: "/dashboard/files", label: "Files" },
	{ prefix: "/dashboard/storage", label: "Storage" },
	{ prefix: "/dashboard/archives", label: "Archives" },
	{ prefix: "/dashboard/settings", label: "Settings" },
	{ prefix: "/dashboard/account", label: "Account" },
	{ prefix: "/dashboard/notifications", label: "Notifications" },
];

export default function Page({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const router = useRouter();
	const pathname = usePathname();
	const {
		setAdmin,
		setOrganizations,
		setOrganizationData,
		setActiveOrganization,
		updateSubscription,
	} = useOrganizationStore((state) => state);
	const { data: session } = authClient.useSession();
	const [organizations, setLocalOrganizations] = useState<Organization[]>([]);

	const pageLabel =
		ROUTE_LABELS.find((route) => pathname.startsWith(route.prefix))
			?.label ?? "Overview";

	useEffect(() => {
		const fetchOrgs = async () => {
			try {
				if (!session?.user.id) return;
				const { organizations, success, error } =
					await getOrganizations(session?.user.id);
				if (success && organizations) {
					setLocalOrganizations(organizations);
					setOrganizations(organizations);
				} else {
					toast.error(error);
				}
			} catch {
				toast.warning("No workspace found");
			}
		};

		fetchOrgs();
	}, [session?.user.id, setOrganizations]);

	// Move the state update to useEffect to avoid calling it during render
	useEffect(() => {
		const fetchActiveOrg = async () => {
			const { data } =
				await authClient.organization.getFullOrganization();

			if (data) {
				const isAdmin = !!data?.members?.find(
					(member) =>
						member.userId == session?.user?.id &&
						member.role == "admin"
				);
				setOrganizationData(
					data as Organization,
					(data?.members as Member[]) || [],
					data?.invitations || []
				);
				setAdmin(isAdmin);

				if (session?.subscription) {
					updateSubscription(session.subscription);
				}
			} else {
				if (session?.activeOrganizationId || organizations) {
					setActiveOrganization(
						session?.activeOrganizationId || organizations![0].id
					);
				} else {
					router.push("/onboarding");
				}
			}

			if (organizations) {
				setOrganizations(organizations);
			}
		};

		fetchActiveOrg();
	}, [
		router,
		session,
		organizations,
		setOrganizationData,
		setOrganizations,
		setAdmin,
		setActiveOrganization,
		updateSubscription,
	]);

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset className="bg-muted">
				<header className="flex h-[68px] shrink-0 items-center gap-4 border-b border-border bg-background px-4 transition-[width,height] ease-linear md:px-8 group-has-data-[collapsible=icon]/sidebar-wrapper:h-16">
					<SidebarTrigger className="size-11 rounded-[8px] bg-muted text-foreground hover:bg-border" />
					<span className="text-sm font-medium">{pageLabel}</span>
					<span className="ml-auto rounded-sm bg-lime px-2.5 py-1 text-xs font-medium text-ink">
						Live data
					</span>
					<NotificationDropdown />
				</header>
				<div className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col">
					<DashboardStoreProvider>{children}</DashboardStoreProvider>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
