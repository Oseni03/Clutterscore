"use client";

import * as React from "react";
import {
	Fan,
	HardDrive,
	LayoutDashboard,
	Settings,
	Settings2,
	User,
} from "lucide-react";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavSecondary } from "./nav-secondary";

// This is sample data.
const dashboardItems = {
	navMain: [
		{
			id: "overview",
			label: "Overview",
			icon: LayoutDashboard,
			url: "/dashboard",
		},
		{
			id: "playbooks",
			label: "Playbooks",
			icon: Fan,
			url: "/dashboard/playbooks",
		},
		{
			id: "storage",
			label: "Storage Audit",
			icon: HardDrive,
			url: "/dashboard/storage",
		},
	],
	navSecondary: [
		{
			title: "Settings",
			icon: Settings,
			url: `/dashboard/settings`,
		},
	],
};

const accountItems = [
	{
		id: "profile",
		label: "Profile",
		url: "/dashboard/account",
		icon: User,
	},
	{
		id: "preferences",
		label: "Preferences",
		url: "/dashboard/account/preferences",
		icon: Settings2,
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const isAccountPage = pathname.includes("/dashboard/account");
	const items = isAccountPage ? accountItems : dashboardItems.navMain;
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<TeamSwitcher />
			</SidebarHeader>
			<SidebarContent>
				{/* We create a SidebarGroup for each parent. */}
				<SidebarGroup>
					<SidebarGroupLabel>
						{isAccountPage ? "Account" : "Application"}
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.id}>
									<SidebarMenuButton
										tooltip={item.label}
										isActive={item.url == pathname}
										asChild
									>
										<Link href={item.url}>
											{item.icon && (
												<item.icon className="h-5 w-5 mr-2" />
											)}
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavSecondary items={dashboardItems.navSecondary} />
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
