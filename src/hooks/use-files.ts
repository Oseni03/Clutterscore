"use client";

import { useState, useEffect, useCallback } from "react";
import { useFilesStore } from "@/zustand/providers/files-store-provider";
import { FilesListResponse } from "@/types/audit";
import { toast } from "sonner";

export function useFiles() {
	const files = useFilesStore((state) => state.files);
	const filters = useFilesStore((state) => state.filters);
	const pagination = useFilesStore((state) => state.pagination);

	const setFiles = useFilesStore((state) => state.setFiles);
	const setFilters = useFilesStore((state) => state.setFilters);
	const setPagination = useFilesStore((state) => state.setPagination);

	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchFiles = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const params = new URLSearchParams({
				page: pagination.page.toString(),
				limit: pagination.limit.toString(),
			});

			if (filters.source !== "all") {
				params.set("source", filters.source);
			}
			if (filters.type !== "all") {
				params.set("type", filters.type);
			}
			if (filters.isDuplicate !== null) {
				params.set("isDuplicate", filters.isDuplicate.toString());
			}
			if (filters.isPubliclyShared !== null) {
				params.set(
					"isPubliclyShared",
					filters.isPubliclyShared.toString()
				);
			}

			const response = await fetch(`/api/files?${params.toString()}`);
			const data: FilesListResponse = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch files");
			}

			setFiles(data.files);
			setPagination({
				total: data.pagination.total,
				page: data.pagination.page,
			});
		} catch (err) {
			const errorMsg = (err as Error).message || "Failed to load files";
			setError(errorMsg);
			toast.error(errorMsg);
		} finally {
			setIsLoading(false);
		}
	}, [filters, pagination.page, pagination.limit, setFiles, setPagination]);

	const getFilteredFiles = useCallback(() => {
		if (!filters.search) return files;

		return files.filter(
			(file) =>
				file.name
					.toLowerCase()
					.includes(filters.search.toLowerCase()) ||
				file.path
					?.toLowerCase()
					.includes(filters.search.toLowerCase()) ||
				file.ownerEmail
					?.toLowerCase()
					.includes(filters.search.toLowerCase())
		);
	}, [files, filters.search]);

	const deleteFile = useCallback(
		async (fileId: string) => {
			try {
				const response = await fetch(`/api/files/${fileId}`, {
					method: "DELETE",
				});

				const data = await response.json();

				if (!response.ok) {
					throw new Error(data.error || "Failed to delete file");
				}

				toast.success("File deleted successfully");
				await fetchFiles();
			} catch (err) {
				toast.error((err as Error).message || "Failed to delete file");
				throw err;
			}
		},
		[fetchFiles]
	);

	const exportFiles = useCallback(async () => {
		try {
			const response = await fetch("/api/files/export");
			const blob = await response.blob();

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `files-export-${new Date().toISOString().split("T")[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Files exported successfully");
		} catch (err) {
			toast.error("Failed to export files");
			throw err;
		}
	}, []);

	const getTotalSize = useCallback(() => {
		return files.reduce((sum, file) => sum + file.sizeMb, 0);
	}, [files]);

	const getDuplicatesCount = useCallback(() => {
		return files.filter((f) => f.isDuplicate).length;
	}, [files]);

	const getPublicFilesCount = useCallback(() => {
		return files.filter((f) => f.isPubliclyShared).length;
	}, [files]);

	// Fetch files on mount and when dependencies change
	useEffect(() => {
		fetchFiles();
	}, [fetchFiles]);

	return {
		// State
		files: getFilteredFiles(),
		allFiles: files,
		filters,
		pagination,
		isLoading,
		error,

		// Actions
		setFilters,
		setPagination,
		deleteFile,
		exportFiles,
		refresh: fetchFiles,

		// Computed
		getTotalSize,
		getDuplicatesCount,
		getPublicFilesCount,
	};
}
