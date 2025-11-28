"use client";

import { type ReactNode, createContext, useRef, useContext } from "react";
import { useStore } from "zustand";
import { FilesState, createFilesStore } from "@/zustand/stores/files-store";

export type FilesStoreApi = ReturnType<typeof createFilesStore>;

export const FilesStoreContext = createContext<FilesStoreApi | undefined>(
	undefined
);

export interface FilesStoreProviderProps {
	children: ReactNode;
}

export const FilesStoreProvider = ({ children }: FilesStoreProviderProps) => {
	const storeRef = useRef<FilesStoreApi | null>(null);

	if (storeRef.current === null) {
		storeRef.current = createFilesStore();
	}

	return (
		<FilesStoreContext.Provider value={storeRef.current}>
			{children}
		</FilesStoreContext.Provider>
	);
};

export const useFilesStore = <T,>(selector: (store: FilesState) => T): T => {
	const filesStoreContext = useContext(FilesStoreContext);

	if (!filesStoreContext) {
		throw new Error("useFilesStore must be used within FilesStoreProvider");
	}

	return useStore(filesStoreContext, selector);
};
