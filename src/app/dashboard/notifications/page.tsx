// components/notifications/notifications-page-client.tsx
"use client";

import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	CheckCircle2,
	AlertCircle,
	XCircle,
	Info,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useNotificationStore } from "@/zustand/providers/notifications-store-provider";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

const getIconForType = (type: string) => {
	switch (type) {
		case "PLAYBOOK_READY":
		case "AUDIT_COMPLETE":
			return <CheckCircle2 className="h-4 w-4 text-green-600" />;
		case "RISK_DETECTED":
		case "SUBSCRIPTION_EXPIRING":
		case "APPROVAL_REQUIRED":
			return <AlertCircle className="h-4 w-4 text-yellow-600" />;
		case "INTEGRATION_ERROR":
			return <XCircle className="h-4 w-4 text-red-600" />;
		default:
			return <Info className="h-4 w-4 text-blue-600" />;
	}
};

export default function NotificationsPage() {
	const {
		notifications,
		pagination,
		loading,
		fetchNotifications,
		markAsRead,
		markAllAsRead,
	} = useNotificationStore((s) => ({
		notifications: s.notifications,
		pagination: s.pagination,
		loading: s.loading,
		fetchNotifications: s.fetchNotifications,
		markAllAsRead: s.markAllAsRead,
		markAsRead: s.markAsRead,
	}));

	const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
	const currentPage = useNotificationStore(
		(state) => Math.floor(state.notifications.length / ITEMS_PER_PAGE) || 1
	); // Simple client-side calc; real pagination would use server offset

	useEffect(() => {
		fetchNotifications();
	}, [fetchNotifications]);

	const paginated = notifications.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE
	);

	return (
		<div className="container mx-auto px-4 py-8 max-w-5xl">
			<Card className="shadow-sm">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-2xl">
								Notifications
							</CardTitle>
							<CardDescription>
								Manage and review all your activity
							</CardDescription>
						</div>
						{notifications.some((n) => !n.read) && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => markAllAsRead()}
								disabled={loading}
							>
								Mark all as read
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<ScrollArea className="h-[600px]">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12"></TableHead>
									<TableHead>Message</TableHead>
									<TableHead className="text-right hidden sm:table-cell">
										Time
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{loading ? (
									Array.from({ length: 8 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell>
												<Skeleton className="h-4 w-4 rounded-full" />
											</TableCell>
											<TableCell>
												<Skeleton className="h-4 w-[300px]" />
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												<Skeleton className="h-4 w-20 ml-auto" />
											</TableCell>
										</TableRow>
									))
								) : notifications.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={3}
											className="text-center py-12"
										>
											<div className="text-muted-foreground">
												No notifications yet
											</div>
										</TableCell>
									</TableRow>
								) : (
									paginated.map((notif) => (
										<TableRow
											key={notif.id}
											className={cn(
												"cursor-pointer transition-colors hover:bg-muted/50",
												!notif.read && "bg-muted/30"
											)}
											onClick={() =>
												!notif.read &&
												markAsRead(notif.id)
											}
										>
											<TableCell>
												{getIconForType(notif.type)}
											</TableCell>
											<TableCell>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<p className="font-medium">
															{notif.title}
														</p>
														{!notif.read && (
															<Badge
																variant="secondary"
																className="text-xs"
															>
																New
															</Badge>
														)}
													</div>
													<p className="text-sm text-muted-foreground">
														{notif.message}
													</p>
													{notif.actionUrl && (
														<Link
															href={
																notif.actionUrl
															}
															className="text-xs text-primary hover:underline"
															onClick={(e) =>
																e.stopPropagation()
															}
														>
															Take action →
														</Link>
													)}
												</div>
											</TableCell>
											<TableCell className="text-right text-sm text-muted-foreground hidden sm:table-cell">
												{formatDistanceToNow(
													new Date(notif.createdAt),
													{
														addSuffix: true,
													}
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</ScrollArea>

					{/* Simple client-side pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between border-t px-4 py-3">
							<p className="text-sm text-muted-foreground">
								Page {currentPage} of {totalPages}
							</p>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={!pagination?.hasPrev || loading}
									onClick={() =>
										fetchNotifications(pagination!.page - 1)
									}
								>
									<ChevronLeft className="h-4 w-4" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={!pagination?.hasNext || loading}
									onClick={() =>
										fetchNotifications(pagination!.page + 1)
									}
								>
									Next
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
