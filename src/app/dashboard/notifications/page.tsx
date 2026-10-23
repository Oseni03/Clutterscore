"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
	AlertTriangle,
	Bell,
	Check,
	Clock,
	FileText,
	Loader2,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import { Notification, NotificationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotificationStore } from "@/zustand/providers/notifications-store-provider";

const ACTION_LABELS: Record<NotificationType, string> = {
	AUDIT_COMPLETE: "View overview",
	PLAYBOOK_READY: "Review playbook",
	RISK_DETECTED: "View files",
	INTEGRATION_ERROR: "Fix integration",
	SUBSCRIPTION_EXPIRING: "Manage plan",
	APPROVAL_REQUIRED: "Review and approve",
};

function NotificationIcon({ type }: { type: NotificationType }) {
	const iconClass = "size-[18px]";

	switch (type) {
		case "AUDIT_COMPLETE":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-lime">
					<Check className={iconClass} strokeWidth={2.5} />
				</span>
			);
		case "PLAYBOOK_READY":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#B9A9D6]">
					<FileText className={iconClass} />
				</span>
			);
		case "RISK_DETECTED":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#F4B183]">
					<AlertTriangle className={iconClass} />
				</span>
			);
		case "INTEGRATION_ERROR":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#F4B183]">
					<XCircle className={iconClass} />
				</span>
			);
		case "SUBSCRIPTION_EXPIRING":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#E4DDF1]">
					<Clock className={iconClass} />
				</span>
			);
		case "APPROVAL_REQUIRED":
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#8FA9A8]">
					<ShieldCheck className={iconClass} />
				</span>
			);
		default:
			return (
				<span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-muted">
					<Bell className={iconClass} />
				</span>
			);
	}
}

function formatWhen(value: Date | string) {
	const date = new Date(value);
	const diff = Math.max(0, Date.now() - date.getTime());
	const minutes = Math.floor(diff / 60000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes} min ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	}

	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	return `${days} days ago`;
}

function NotificationRow({
	notification,
	onRead,
}: {
	notification: Notification;
	onRead: (id: string) => void;
}) {
	const unread = !notification.read;

	const markRead = () => {
		if (unread) onRead(notification.id);
	};

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={markRead}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					markRead();
				}
			}}
			className={`flex w-full cursor-pointer flex-wrap items-center gap-3 border-b border-border px-5 py-4 text-left transition-colors last:border-0 ${
				unread
					? "bg-muted"
					: "bg-background hover:bg-muted/40"
			}`}
		>
			<NotificationIcon type={notification.type} />

			<div className="min-w-0 flex-1 basis-[320px]">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-[15px] font-semibold">
						{notification.title}
					</span>
					{unread && (
						<span className="rounded-md bg-lime px-2 py-0.5 text-[11px] font-semibold text-ink">
							New
						</span>
					)}
				</div>
				<p className="text-sm text-muted-foreground">
					{notification.message}
				</p>
			</div>

			{notification.actionUrl && (
				<Link
					href={notification.actionUrl}
					onClick={(event) => {
						event.stopPropagation();
						markRead();
					}}
					className="shrink-0 text-[13px] font-semibold underline underline-offset-4"
				>
					{ACTION_LABELS[notification.type]}
				</Link>
			)}

			<span className="w-[90px] shrink-0 text-right text-[13px] text-muted-foreground">
				{formatWhen(notification.createdAt)}
			</span>
		</div>
	);
}

export default function NotificationsPage() {
	const notifications = useNotificationStore((state) => state.notifications);
	const pagination = useNotificationStore((state) => state.pagination);
	const loading = useNotificationStore((state) => state.loading);
	const error = useNotificationStore((state) => state.error);
	const unreadCount = useNotificationStore((state) => state.unreadCount);
	const fetchNotifications = useNotificationStore(
		(state) => state.fetchNotifications
	);
	const markAsRead = useNotificationStore((state) => state.markAsRead);
	const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
	const [markingAll, setMarkingAll] = useState(false);

	useEffect(() => {
		fetchNotifications(1);
	}, [fetchNotifications]);

	const handleMarkAll = async () => {
		setMarkingAll(true);
		try {
			await markAllAsRead();
		} finally {
			setMarkingAll(false);
		}
	};

	const initialLoading = loading && notifications.length === 0;
	const page = pagination?.page ?? 1;
	const pageSize = pagination?.pageSize ?? 8;
	const totalCount = pagination?.totalCount ?? 0;
	const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, totalCount);

	const handlePrev = () => {
		if (pagination?.hasPrev) {
			fetchNotifications(pagination.page - 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const handleNext = () => {
		if (pagination?.hasNext) {
			fetchNotifications(pagination.page + 1);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	return (
		<div className="space-y-6 p-6 md:p-8">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="font-display text-[36px] font-semibold leading-none tracking-[-0.035em]">
						Notifications
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{unreadCount} unread. Click a notification to mark it
						as read.
					</p>
				</div>
				<Button
					onClick={handleMarkAll}
					disabled={unreadCount === 0 || loading}
					className="h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/90"
				>
					{markingAll && (
						<Loader2 className="size-4 animate-spin" />
					)}
					Mark all as read
				</Button>
			</div>

			{error && (
				<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
					<span className="size-2.5 rounded-full bg-[#F4B183]" />
					<p className="min-w-0 flex-1 text-sm">{error}</p>
					<Button
						variant="outline"
						onClick={() => fetchNotifications(page)}
						disabled={loading}
						className="h-9 rounded-full border-border bg-background px-4 text-[13px] font-semibold"
					>
						Try again
					</Button>
				</div>
			)}

			<div className="overflow-hidden rounded-xl border border-border bg-background">
				{initialLoading ? (
					Array.from({ length: 8 }).map((_, index) => (
						<div
							key={index}
							className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0"
						>
							<Skeleton className="size-10 rounded-xl" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-3.5 w-80 max-w-full" />
							</div>
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-16" />
						</div>
					))
				) : notifications.length === 0 ? (
					<div className="px-6 py-16 text-center">
						<Bell className="mx-auto size-8 text-muted-foreground" />
						<h2 className="mt-4 font-display text-[22px] font-semibold">
							{error
								? "Couldn't load notifications"
								: "You're all caught up"}
						</h2>
						<p className="mt-2 text-sm text-muted-foreground">
							{error
								? "Use the retry button above to try again."
								: "New notifications will appear here."}
						</p>
					</div>
				) : (
					notifications.map((notification) => (
						<NotificationRow
							key={notification.id}
							notification={notification}
							onRead={markAsRead}
						/>
					))
				)}
			</div>

			{pagination && pagination.totalCount > 0 && (
				<div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
					<span>
						Showing {start} to {end} of {totalCount} notifications{" "}
						{"\u00B7"} Page {page} of{" "}
						{Math.max(pagination.totalPages, 1)}
					</span>
					<div className="flex gap-2">
						<Button
							variant="outline"
							onClick={handlePrev}
							disabled={!pagination.hasPrev || loading}
							className="h-9 rounded-full border-border bg-background px-4 text-[13px] font-semibold"
						>
							Previous
						</Button>
						<Button
							onClick={handleNext}
							disabled={!pagination.hasNext || loading}
							className="h-9 rounded-full bg-ink px-4 text-[13px] font-semibold text-paper hover:bg-ink/90 disabled:bg-muted disabled:text-muted-foreground"
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
