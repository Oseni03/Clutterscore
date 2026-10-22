"use client";

import {
	ChevronsUpDown,
	CreditCard,
	LogOut,
	Sparkles,
	UserCircle,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
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
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

export function NavUser() {
	const { user } = authClient.useSession().data || {};
	const { isMobile } = useSidebar();
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			toast.loading("Signing out");
			authClient.signOut();
			toast.dismiss();
			toast.success("Signed out");
			router.push("/");
		} catch (error) {
			logger.error("SIGN_OUT_ERROR: ", error);
			toast.dismiss();
			toast.error("Error signing out");
		}
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="h-12 rounded-md px-2.5 hover:bg-muted data-[state=open]:bg-muted"
						>
							<Avatar className="size-8">
								<AvatarImage
									src={user?.image || ""}
									alt={user?.name}
								/>
								<AvatarFallback className="bg-orb" />
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate text-[13px]">
									{user?.email}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="size-8">
									<AvatarImage
										src={user?.image || ""}
										alt={user?.name}
									/>
									<AvatarFallback className="bg-orb" />
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">
										{user?.name}
									</span>
									<span className="truncate text-xs">
										{user?.email}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() =>
									router.push("/dashboard/account")
								}
							>
								<UserCircle />
								Account Settings
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() =>
									router.push("/dashboard/settings/workspace")
								}
							>
								<Sparkles />
								Workspace Settings
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									router.push("/dashboard/settings/billing")
								}
							>
								<CreditCard />
								Billing
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
