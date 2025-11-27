"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import {
	PlaybooksState,
	createPlaybooksStore,
} from "@/zustand/stores/playbooks-store";

export type PlaybooksStoreApi = ReturnType<typeof createPlaybooksStore>;

export const PlaybooksStoreContext = createContext<
	PlaybooksStoreApi | undefined
>(undefined);

export interface PlaybooksStoreProviderProps {
	children: ReactNode;
}

export const PlaybooksStoreProvider = ({
	children,
}: PlaybooksStoreProviderProps) => {
	const storeRef = useRef<PlaybooksStoreApi | null>(null);

	if (storeRef.current === null) {
		storeRef.current = createPlaybooksStore();
	}

	return (
		<PlaybooksStoreContext.Provider value={storeRef.current}>
			{children}
		</PlaybooksStoreContext.Provider>
	);
};

export const usePlaybooksStore = <T,>(
	selector: (store: PlaybooksState) => T
): T => {
	const playbooksStoreContext = useContext(PlaybooksStoreContext);

	if (!playbooksStoreContext) {
		throw new Error(
			"usePlaybooksStore must be used within PlaybooksStoreProvider"
		);
	}

	return useStore(playbooksStoreContext, selector);
};
