// Layout page
"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useOrganizationStore } from "@/zustand/providers/organization-store-provider";
import { Member } from "@/types";
import { DashboardStoreProvider } from "@/zustand/providers/dashboard-store-provider";
import { useRouter } from "next/navigation";
import { getOrganizations } from "@/server/organizations";
import { Organization } from "@prisma/client";
import { logger } from "@/lib/logger";

export default function Page({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const router = useRouter();
	const {
		setAdmin,
		setOrganizations,
		setOrganizationData,
		setActiveOrganization,
		updateSubscription,
	} = useOrganizationStore((state) => state);
	const { data: session } = authClient.useSession();
	const [organizations, setLocalOrganizations] = useState<Organization[]>([]);

	useEffect(() => {
		const fetchOrgs = async () => {
			try {
				if (!session?.user.id) return;
				const organizations = await getOrganizations(session?.user.id);
				if (organizations) {
					setLocalOrganizations(organizations);
					setOrganizations(organizations);
				}
			} catch (error) {
				logger.debug("Error fetching organizations", error as Error);
			}
		};

		fetchOrgs();
	}, [session?.user.id, setOrganizations]);

	// Move the state update to useEffect to avoid calling it during render
	useEffect(() => {
		const fetchActiveOrg = async () => {
			const { data, error } =
				await authClient.organization.getFullOrganization();

			if (error) {
				logger.error("FETCH_ACTIVE_ORG_ERROR:", error);
				return;
			}
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
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
					</div>
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<DashboardStoreProvider>{children}</DashboardStoreProvider>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
