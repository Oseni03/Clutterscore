"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import {
	AuditLogsState,
	createAuditLogsStore,
} from "@/zustand/stores/audit-logs-store";

export type AuditLogsStoreApi = ReturnType<typeof createAuditLogsStore>;

export const AuditLogsStoreContext = createContext<
	AuditLogsStoreApi | undefined
>(undefined);

export interface AuditLogsStoreProviderProps {
	children: ReactNode;
}

export const AuditLogsStoreProvider = ({
	children,
}: AuditLogsStoreProviderProps) => {
	const storeRef = useRef<AuditLogsStoreApi | null>(null);

	if (storeRef.current === null) {
		storeRef.current = createAuditLogsStore();
	}

	return (
		<AuditLogsStoreContext.Provider value={storeRef.current}>
			{children}
		</AuditLogsStoreContext.Provider>
	);
};

export const useAuditLogsStore = <T,>(
	selector: (store: AuditLogsState) => T
): T => {
	const auditLogsStoreContext = useContext(AuditLogsStoreContext);

	if (!auditLogsStoreContext) {
		throw new Error(
			"useAuditLogsStore must be used within AuditLogsStoreProvider"
		);
	}

	return useStore(auditLogsStoreContext, selector);
};
