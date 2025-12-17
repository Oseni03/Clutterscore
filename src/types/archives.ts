/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ArchivedFile {
	id: string;
	name: string;
	sizeMb: number;
	source: string;
	archivedAt: string;
	expiresAt: string;
	status: string;
	downloadUrl: string;
	metadata: any;
}

export interface ArchiveStats {
	totalFiles: number;
	totalSizeMb: number;
	bySource: Record<string, number>;
	expiringSoon: number;
}
