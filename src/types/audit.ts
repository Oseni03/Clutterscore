/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/types/audit.ts

import { Prisma } from "@prisma/client";

/**
 * Audit Result with nested relations
 */
export type AuditResultWithRelations = Prisma.AuditResultGetPayload<{
	include: {
		playbooks: {
			include: {
				items: true;
			};
		};
		files: true;
		_count: {
			select: {
				files: true;
			};
		};
	};
}>;

/**
 * Playbook with items
 */
export type PlaybookWithItems = Prisma.PlaybookGetPayload<{
	include: {
		items: true;
	};
}>;

/**
 * Playbook Item
 */
export type PlaybookItemType = Prisma.PlaybookItemGetPayload<object>;

/**
 * API Response for latest audit
 */
export interface LatestAuditResponse {
	success: boolean;
	auditResult: AuditResultWithRelations;
	error?: any;
}

/**
 * Simplified audit data for dashboard
 */
export interface DashboardAuditData {
	id: string;
	score: number;
	estimatedSavings: number;
	storageWaste: number;
	licenseWaste: number;
	activeRisks: number;
	criticalRisks: number;
	moderateRisks: number;
	auditedAt: string;
	playbooks: PlaybookWithItems[];
	_count: {
		files: number;
	};
}

/**
 * Score trend data
 */
export type ScoreTrendData = Prisma.ScoreTrendGetPayload<object>;

/**
 * File data
 */
export type FileData = Prisma.FileGetPayload<object>;

/**
 * Activity log
 */
export type ActivityData = Prisma.ActivityGetPayload<{
	include: {
		user: {
			select: {
				name: true;
				email: true;
			};
		};
	};
}>;

/**
 * Audit log
 */
export type AuditLogData = Prisma.AuditLogGetPayload<{
	include: {
		user: {
			select: {
				name: true;
				email: true;
			};
		};
		playbook: {
			select: {
				title: true;
				source: true;
			};
		};
	};
}>;

/**
 * Transform AuditResult to DashboardAuditData
 */
export function transformAuditData(
	auditResult: AuditResultWithRelations
): DashboardAuditData {
	return {
		id: auditResult.id,
		score: auditResult.score,
		estimatedSavings: auditResult.estimatedSavings,
		storageWaste: auditResult.storageWaste,
		licenseWaste: auditResult.licenseWaste,
		activeRisks: auditResult.activeRisks,
		criticalRisks: auditResult.criticalRisks,
		moderateRisks: auditResult.moderateRisks,
		auditedAt: auditResult.auditedAt.toISOString(),
		playbooks: auditResult.playbooks,
		_count: auditResult._count,
	};
}

/**
 * Playbook summary for lists
 */
export interface PlaybookSummary {
	id: string;
	title: string;
	description: string;
	impact: string;
	impactType: "SECURITY" | "SAVINGS" | "EFFICIENCY";
	source: string;
	itemsCount: number;
	status:
		| "PENDING"
		| "APPROVED"
		| "DISMISSED"
		| "EXECUTING"
		| "EXECUTED"
		| "FAILED";
	riskLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
	estimatedSavings?: number | null;
	createdAt: string;
	executedAt?: string | null;
}

/**
 * Transform Playbook to PlaybookSummary
 */
export function transformPlaybookSummary(
	playbook: PlaybookWithItems
): PlaybookSummary {
	return {
		id: playbook.id,
		title: playbook.title,
		description: playbook.description,
		impact: playbook.impact,
		impactType: playbook.impactType,
		source: playbook.source,
		itemsCount: playbook.itemsCount,
		status: playbook.status,
		riskLevel: playbook.riskLevel,
		estimatedSavings: playbook.estimatedSavings,
		createdAt: playbook.createdAt.toISOString(),
		executedAt: playbook.executedAt?.toISOString() || null,
	};
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
	error?: any;
}

/**
 * Files list response
 */
export interface FilesListResponse extends PaginatedResponse<FileData> {
	files: FileData[];
}

/**
 * Playbooks list response
 */
export interface PlaybooksListResponse {
	success: boolean;
	playbooks: PlaybookWithItems[];
	error?: any;
}

/**
 * Audit logs list response
 */
export interface AuditLogsListResponse extends PaginatedResponse<AuditLogData> {
	logs: AuditLogData[];
}

/**
 * Activities list response
 */
export interface ActivitiesListResponse
	extends PaginatedResponse<ActivityData> {
	activities: ActivityData[];
}

/**
 * Score trends response
 */
export interface ScoreTrendsResponse {
	success: boolean;
	trends: ScoreTrendData[];
	error?: any;
}

/**
 * Integration data
 */
export type IntegrationData = Prisma.ToolIntegrationGetPayload<{
	select: {
		id: true;
		source: true;
		isActive: true;
		connectedAt: true;
		lastSyncedAt: true;
		syncStatus: true;
		lastError: true;
		lastErrorAt: true;
		scopes: true;
		metadata: true;
	};
}>;

/**
 * Integrations list response
 */
export interface IntegrationsListResponse {
	success: boolean;
	integrations: IntegrationData[];
}

/**
 * Integration status summary
 */
export interface IntegrationStatusSummary {
	total: number;
	syncing: number;
	error: number;
	idle: number;
	integrations: {
		source: string;
		status: "IDLE" | "SYNCING" | "ERROR";
		lastSynced: Date | null;
		error: string | null;
	}[];
}

/**
 * Integration status response
 */
export interface IntegrationStatusResponse {
	success: boolean;
	status: IntegrationStatusSummary;
}
