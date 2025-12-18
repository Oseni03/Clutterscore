"use client";

import { useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, XCircle, Info } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/zustand/providers/notifications-store-provider";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Notification, NotificationType } from "@prisma/client";

interface NotificationItemProps extends Notification {
	onMarkRead: (id: string) => void;
}

const getIconForType = (type: NotificationType) => {
	switch (type) {
		case "PLAYBOOK_READY":
		case "AUDIT_COMPLETE":
			return <CheckCircle2 className="h-4 w-4 text-green-500" />;
		case "RISK_DETECTED":
		case "SUBSCRIPTION_EXPIRING":
		case "APPROVAL_REQUIRED":
			return <AlertCircle className="h-4 w-4 text-yellow-500" />;
		case "INTEGRATION_ERROR":
			return <XCircle className="h-4 w-4 text-red-500" />;
		default:
			return <Info className="h-4 w-4 text-blue-500" />;
	}
};

const NotificationItem: React.FC<NotificationItemProps> = ({
	id,
	type,
	title,
	message,
	read,
	actionUrl,
	createdAt,
	onMarkRead,
}) => (
	<DropdownMenuItem
		className={cn(
			"flex items-start gap-3 p-3 cursor-pointer",
			!read && "bg-muted/50"
		)}
		onClick={() => !read && onMarkRead(id)}
	>
		{getIconForType(type)}
		<div className="flex-1 space-y-1">
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium leading-none">{title}</p>
				{!read && (
					<Badge variant="secondary" className="h-4 px-1 text-xs">
						New
					</Badge>
				)}
			</div>
			<p className="text-xs text-muted-foreground">{message}</p>
			<p className="text-xs text-muted-foreground">
				{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
			</p>
			{actionUrl && (
				<Link
					href={actionUrl}
					className="text-xs text-primary hover:underline"
				>
					Take action
				</Link>
			)}
		</div>
	</DropdownMenuItem>
);

export const NotificationDropdown = () => {
	const {
		notifications,
		unreadCount,
		fetchNotifications,
		markAsRead,
		loading,
	} = useNotificationStore((state) => state);

	useEffect(() => {
		fetchNotifications();
	}, [fetchNotifications]);

	const handleMarkRead = async (id: string) => {
		await markAsRead(id);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-8 w-8 p-0 rounded-full"
					aria-label="Notifications"
				>
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs"
						>
							{unreadCount > 9 ? "9+" : unreadCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-[320px] sm:w-[380px] p-0"
			>
				<DropdownMenuLabel className="flex items-center justify-between p-4">
					<span className="font-semibold">Notifications</span>
					<Link
						href="/dashboard/notifications"
						className="text-xs text-primary hover:underline"
					>
						View all
					</Link>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<ScrollArea className="h-[300px] sm:h-[400px]">
					{loading ? (
						<div className="flex justify-center p-4">
							<p className="text-sm text-muted-foreground">
								Loading...
							</p>
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center p-6 text-center">
							<Bell className="h-8 w-8 text-muted-foreground mb-2" />
							<p className="text-sm text-muted-foreground">
								No notifications yet
							</p>
						</div>
					) : (
						notifications.map((notif) => (
							<NotificationItem
								key={notif.id}
								{...notif}
								onMarkRead={handleMarkRead}
							/>
						))
					)}
				</ScrollArea>
				<DropdownMenuSeparator />
				<DropdownMenuItem className="justify-center text-center text-xs text-muted-foreground p-2">
					Notifications update in real-time
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
