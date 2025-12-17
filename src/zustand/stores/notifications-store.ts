// stores/notification-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Notification } from "@prisma/client";

export interface NotificationState {
	notifications: Notification[];
	unreadCount: number;
	loading: boolean;
	error: string | null;

	setNotifications: (notifications: Notification[]) => void;
	addNotification: (notification: Notification) => void;
	markAsRead: (id: string) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	fetchNotifications: () => Promise<void>;
	clearError: () => void;
}

export const createNotificationStore = () => {
	return create<NotificationState>()(
		persist(
			immer((set) => ({
				notifications: [],
				unreadCount: 0,
				loading: false,
				error: null,

				setNotifications: (notifications: Notification[]) =>
					set({
						notifications,
						unreadCount: notifications.filter(
							(n: Notification) => !n.read
						).length,
					}),

				addNotification: (notification: Notification) =>
					set((state) => {
						const exists = state.notifications.some(
							(n: Notification) => n.id === notification.id
						);
						if (!exists) {
							state.notifications.unshift(notification);
							if (!notification.read) state.unreadCount += 1;
						}
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
								(n: Notification) => n.id === id
							);
							if (notif && !notif.read) {
								notif.read = true;
								state.unreadCount -= 1;
							}
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

						set((state) => {
							state.notifications.forEach(
								(n: Notification) => (n.read = true)
							);
							state.unreadCount = 0;
						});
					} catch (err) {
						set({ error: (err as Error).message });
					} finally {
						set({ loading: false });
					}
				},

				fetchNotifications: async () => {
					set({ loading: true, error: null });
					try {
						const response = await fetch("/api/notifications");
						if (!response.ok)
							throw new Error("Failed to fetch notifications");
						const data: Notification[] = await response.json();

						data.sort(
							(a: Notification, b: Notification) =>
								new Date(b.createdAt).getTime() -
								new Date(a.createdAt).getTime()
						);

						set({
							notifications: data,
							unreadCount: data.filter(
								(n: Notification) => !n.read
							).length,
						});
					} catch (err) {
						set({ error: (err as Error).message });
					} finally {
						set({ loading: false });
					}
				},

				clearError: () => set({ error: null }),
			})),
			{
				name: "notification-store",
				partialize: (state) => ({ notifications: state.notifications }),
			}
		)
	);
};
