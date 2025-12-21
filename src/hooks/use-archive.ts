"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArchivedFile, ArchiveStats } from "@/types/archives";

export function useArchive() {
	const [archives, setArchives] = useState<ArchivedFile[]>([]);
	const [stats, setStats] = useState<ArchiveStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadArchives();
	}, []);

	const loadArchives = async () => {
		try {
			setLoading(true);
			setError(null);

			const [archivesRes, statsRes] = await Promise.all([
				fetch("/api/archives"),
				fetch("/api/archives/stats"),
			]);

			if (!archivesRes.ok || !statsRes.ok) {
				throw new Error("Failed to load archives");
			}

			const archivesData = await archivesRes.json();
			const statsData = await statsRes.json();

			setArchives(archivesData.archives);
			setStats(statsData);
		} catch (err) {
			setError((err as Error).message);
			toast.error("Failed to load archives");
		} finally {
			setLoading(false);
		}
	};

	const handleRestore = async (archive: ArchivedFile) => {
		try {
			const response = await fetch(
				`/api/archives/${archive.id}/restore`,
				{
					method: "POST",
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Restore failed");
			}

			toast.success(`Restored ${archive.name} to ${archive.source}`);
			loadArchives();
		} catch (err) {
			toast.error((err as Error).message);
		}
	};
	return { archives, stats, loading, error, loadArchives, handleRestore };
}
