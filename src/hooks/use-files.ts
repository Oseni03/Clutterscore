"use client";

import { useState, useEffect, useCallback } from "react";
import { useFilesStore } from "@/zustand/providers/files-store-provider";
import { FilesListResponse } from "@/types/audit";
import { toast } from "sonner";

export function useFiles() {
	const allFiles = useFilesStore((state) => state.files);
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

			// Safely fallback to defaults if undefined
			const page = pagination.page ?? 1;
			const limit = pagination.limit ?? 20;

			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (filters.source && filters.source !== "all") {
				params.set("source", filters.source);
			}
			if (filters.type && filters.type !== "all") {
				params.set("type", filters.type);
			}
			if (
				filters.isDuplicate !== null &&
				filters.isDuplicate !== undefined
			) {
				params.set("isDuplicate", filters.isDuplicate.toString());
			}
			if (
				filters.isPubliclyShared !== null &&
				filters.isPubliclyShared !== undefined
			) {
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
				limit: data.pagination.limit ?? limit, // preserve limit if not returned
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
		let filtered = [...allFiles];

		// Apply source filter
		if (filters.source && filters.source !== "all") {
			filtered = filtered.filter(
				(file) => file.source === filters.source
			);
		}

		// Apply type filter
		if (filters.type && filters.type !== "all") {
			filtered = filtered.filter((file) => file.type === filters.type);
		}

		// Apply isDuplicate filter
		if (filters.isDuplicate !== null && filters.isDuplicate !== undefined) {
			filtered = filtered.filter(
				(file) => file.isDuplicate === filters.isDuplicate
			);
		}

		// Apply isPubliclyShared filter
		if (
			filters.isPubliclyShared !== null &&
			filters.isPubliclyShared !== undefined
		) {
			filtered = filtered.filter(
				(file) => file.isPubliclyShared === filters.isPubliclyShared
			);
		}

		// Apply search filter
		if (filters.search) {
			const query = filters.search.toLowerCase();
			filtered = filtered.filter(
				(file) =>
					file.name.toLowerCase().includes(query) ||
					file.path?.toLowerCase().includes(query) ||
					file.ownerEmail?.toLowerCase().includes(query)
			);
		}

		return filtered;
	}, [allFiles, filters]);

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

				// Optimistically update the state
				const updatedFiles = allFiles.filter(
					(file) => file.id !== fileId
				);
				setFiles(updatedFiles);

				// Update pagination total
				setPagination({
					total: pagination.total - 1,
				});

				toast.success("File deleted successfully");
			} catch (err) {
				toast.error((err as Error).message || "Failed to delete file");
				// Refetch to ensure consistency on error
				await fetchFiles();
				throw err;
			}
		},
		[allFiles, pagination.total, setFiles, setPagination, fetchFiles]
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
			a.remove();
			window.URL.revokeObjectURL(url);

			toast.success("Files exported successfully");
		} catch (err) {
			toast.error("Failed to export files");
			throw err;
		}
	}, []);

	const getTotalSize = useCallback(() => {
		return allFiles.reduce((sum, file) => sum + (file.sizeMb ?? 0), 0);
	}, [allFiles]);

	const getDuplicatesCount = useCallback(() => {
		return allFiles.filter((f) => f.isDuplicate).length;
	}, [allFiles]);

	const getPublicFilesCount = useCallback(() => {
		return allFiles.filter((f) => f.isPubliclyShared).length;
	}, [allFiles]);

	useEffect(() => {
		fetchFiles();
	}, [fetchFiles]);

	return {
		// State
		files: getFilteredFiles(),
		allFiles,
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
