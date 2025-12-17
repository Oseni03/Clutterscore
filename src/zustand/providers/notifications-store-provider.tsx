import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import {
	createNotificationStore,
	NotificationState,
} from "../stores/notifications-store";

export type NotificationStoreApi = ReturnType<typeof createNotificationStore>;

export const NotificationStoreContext = createContext<
	NotificationStoreApi | undefined
>(undefined);

export interface NotificationStoreProviderProps {
	children: ReactNode;
}

export const NotificationStoreProvider = ({
	children,
}: NotificationStoreProviderProps) => {
	const storeRef = useRef<NotificationStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createNotificationStore();
	}

	return (
		<NotificationStoreContext.Provider value={storeRef.current}>
			{children}
		</NotificationStoreContext.Provider>
	);
};

export const useNotificationStore = <T,>(
	selector: (store: NotificationState) => T
): T => {
	const notificationStoreContext = useContext(NotificationStoreContext);
	if (!notificationStoreContext) {
		throw new Error(
			"useNotificationStore must be used within NotificationStoreProvider"
		);
	}
	return useStore(notificationStoreContext, selector);
};
