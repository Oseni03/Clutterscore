"use client";

import * as React from "react";
import {
	CreditCard,
	Fan,
	Files,
	HardDrive,
	History,
	LayoutDashboard,
	Plug,
	Settings,
	Settings2,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

const dashboardItems = [
	{
		id: "overview",
		title: "Overview",
		icon: LayoutDashboard,
		url: "/dashboard",
	},
	{
		id: "playbooks",
		title: "Playbooks",
		icon: Fan,
		url: "/dashboard/playbooks",
	},
	{
		id: "files",
		title: "Files",
		icon: Files,
		url: "/dashboard/files",
	},
	{
		id: "storage",
		title: "Storage",
		icon: HardDrive,
		url: "/dashboard/storage",
	},
	{
		id: "audit-logs",
		title: "Audit logs",
		icon: History,
		url: "/dashboard/audit-logs",
	},
	{
		id: "integrations",
		title: "Integrations",
		icon: Plug,
		url: "/dashboard/settings/integrations",
	},
	{
		id: "members",
		title: "Members",
		icon: Users,
		url: "/dashboard/settings/users",
	},
	{
		id: "billing",
		title: "Billing",
		icon: CreditCard,
		url: "/dashboard/settings/billing",
	},
	{
		id: "settings",
		title: "Settings",
		icon: Settings,
		url: "/dashboard/settings/workspace",
	},
];

const accountItems = [
	{
		id: "profile",
		title: "Profile",
		icon: User,
		url: "/dashboard/account",
	},
	{
		id: "preferences",
		title: "Preferences",
		icon: Settings2,
		url: "/dashboard/account/preferences",
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const isAccountPage = pathname.includes("/dashboard/account");
	const items = isAccountPage ? accountItems : dashboardItems;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="p-3">
				<TeamSwitcher />
			</SidebarHeader>
			<SidebarContent className="px-3">
				<SidebarGroup className="p-0">
					<SidebarGroupContent>
						<SidebarMenu className="gap-0.5">
							{items.map((item) => {
								const isActive =
									item.url === "/dashboard"
										? pathname === item.url
										: pathname === item.url ||
											pathname.startsWith(`${item.url}/`);

								return (
									<SidebarMenuItem key={item.id}>
										<SidebarMenuButton
											asChild
											tooltip={item.title}
											isActive={isActive}
											className="h-11 rounded-[8px] px-3 text-sm font-medium"
										>
											<Link href={item.url}>
												<item.icon
													className="size-4"
													strokeWidth={1.75}
												/>
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="p-3">
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
