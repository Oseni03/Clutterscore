"use client";

import * as React from "react";
import {
	Fan,
	HardDrive,
	LayoutDashboard,
	Settings,
	Settings2,
	User,
	Building2,
	Users,
	CreditCard,
	Plug,
	ChevronRight,
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
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavSecondary } from "./nav-secondary";

const dashboardItems = {
	navMain: [
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
			id: "storage",
			title: "Storage Audit",
			icon: HardDrive,
			url: "/dashboard/storage",
		},
		{
			id: "settings",
			title: "Settings",
			icon: Settings,
			url: "/dashboard/settings",
			items: [
				{
					title: "Integrations",
					url: "/dashboard/settings/integrations",
					icon: Plug,
				},
				{
					title: "Workspace",
					url: "/dashboard/settings/workspace",
					icon: Building2,
				},
				{
					title: "Users",
					url: "/dashboard/settings/users",
					icon: Users,
				},
				{
					title: "Billing",
					url: "/dashboard/settings/billing",
					icon: CreditCard,
				},
			],
		},
	],
	account: [
		{
			id: "profile",
			title: "Profile",
			url: "/dashboard/account",
			icon: User,
			items: [],
		},
		{
			id: "preferences",
			title: "Preferences",
			url: "/dashboard/account/preferences",
			icon: Settings2,
			items: [],
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const isAccountPage = pathname.includes("/dashboard/account");
	const items = isAccountPage
		? dashboardItems.account
		: dashboardItems.navMain;

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<TeamSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>
						{isAccountPage ? "Account" : "Application"}
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) =>
								item.items ? (
									// Collapsible item with subitems (Settings)
									<Collapsible
										key={item.id}
										asChild
										defaultOpen={pathname.includes(
											item.url
										)}
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton
													tooltip={item.title}
													isActive={pathname.includes(
														item.url
													)}
												>
													{item.icon && (
														<item.icon className="h-5 w-5" />
													)}
													<span>{item.title}</span>
													<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
												</SidebarMenuButton>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<SidebarMenuSub>
													{item.items.map(
														(subItem) => (
															<SidebarMenuSubItem
																key={
																	subItem.title
																}
															>
																<SidebarMenuSubButton
																	asChild
																	isActive={
																		pathname ===
																		subItem.url
																	}
																>
																	<Link
																		href={
																			subItem.url
																		}
																	>
																		{subItem.icon && (
																			<subItem.icon className="h-4 w-4 mr-2" />
																		)}
																		<span>
																			{
																				subItem.title
																			}
																		</span>
																	</Link>
																</SidebarMenuSubButton>
															</SidebarMenuSubItem>
														)
													)}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								) : (
									// Regular item without subitems
									<SidebarMenuItem key={item.id}>
										<SidebarMenuButton
											tooltip={item.title}
											isActive={item.url === pathname}
											asChild
										>
											<Link href={item.url}>
												{item.icon && (
													<item.icon className="h-5 w-5 mr-2" />
												)}
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<NavSecondary items={[]} />
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
