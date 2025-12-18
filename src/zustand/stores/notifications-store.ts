// stores/notification-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notification } from "@prisma/client";

export interface PaginationMeta {
	page: number;
	totalPages: number;
	totalCount: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface NotificationState {
	notifications: Notification[];
	unreadCount: number;
	loading: boolean;
	error: string | null;
	pagination: PaginationMeta | null;

	setNotifications: (
		notifications: Notification[],
		meta: PaginationMeta
	) => void;
	addNotification: (notification: Notification) => void;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	fetchNotifications: (page?: number) => Promise<void>;
	clearError: () => void;
}

export const createNotificationStore = () => {
	return create<NotificationState>()(
		persist(
			(set) => ({
				notifications: [],
				unreadCount: 0,
				loading: false,
				error: null,
				pagination: null,

				setNotifications: (
					notifications: Notification[],
					meta: PaginationMeta
				) =>
					set({
						notifications,
						unreadCount: notifications.filter(
							(n: Notification) => !n.read
						).length,
						pagination: meta,
					}),

				addNotification: (notification: Notification) =>
					set((state) => {
						const exists = state.notifications.some(
							(n) => n.id === notification.id
						);
						if (exists) return state;

						const newNotifications = [
							notification,
							...state.notifications,
						].slice(0, 20); // Keep reasonable size for recent

						return {
							notifications: newNotifications,
							unreadCount: notification.read
								? state.unreadCount
								: state.unreadCount + 1,
							pagination: state.pagination
								? {
										...state.pagination,
										totalCount:
											state.pagination.totalCount + 1,
									}
								: null,
						};
					}),

				markAsRead: async (id: string) => {
					set({ loading: true, error: null });
					try {
						const response = await fetch(
							`/api/notifications/${id}/read`,
							{
								method: "PATCH",
							}
						);
						if (!response.ok)
							throw new Error("Failed to mark as read");

						set((state) => {
							const notif = state.notifications.find(
								(n) => n.id === id
							);
							if (!notif || notif.read) return state;

							return {
								notifications: state.notifications.map((n) =>
									n.id === id ? { ...n, read: true } : n
								),
								unreadCount: state.unreadCount - 1,
							};
						});
					} catch (err) {
						set({ error: (err as Error).message });
					} finally {
						set({ loading: false });
					}
				},

				markAllAsRead: async () => {
					set({ loading: true, error: null });
					try {
						const response = await fetch(
							"/api/notifications/read-all",
							{
								method: "PATCH",
							}
						);
						if (!response.ok)
							throw new Error("Failed to mark all as read");

						set((state) => ({
							notifications: state.notifications.map((n) => ({
								...n,
								read: true,
							})),
							unreadCount: 0,
						}));
					} catch (err) {
						set({ error: (err as Error).message });
					} finally {
						set({ loading: false });
					}
				},

				fetchNotifications: async (page = 1) => {
					set({ loading: true, error: null });
					try {
						const response = await fetch(
							`/api/notifications?page=${page}`
						);
						if (!response.ok)
							throw new Error("Failed to fetch notifications");

						const { notifications, pagination } =
							await response.json();

						notifications.sort(
							(a: Notification, b: Notification) =>
								new Date(b.createdAt).getTime() -
								new Date(a.createdAt).getTime()
						);

						set({
							notifications,
							unreadCount: notifications.filter(
								(n: Notification) => !n.read
							).length,
							pagination,
						});
					} catch (err) {
						set({ error: (err as Error).message });
					} finally {
						set({ loading: false });
					}
				},

				clearError: () => set({ error: null }),
			}),
			{
				name: "notification-store",
				partialize: (state) => ({
					notifications: state.notifications,
					pagination: state.pagination,
				}),
			}
		)
	);
};
