-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'USER');

-- CreateEnum
CREATE TYPE "public"."ImpactType" AS ENUM ('SECURITY', 'SAVINGS', 'EFFICIENCY');

-- CreateEnum
CREATE TYPE "public"."ToolSource" AS ENUM ('SLACK', 'GOOGLE', 'MICROSOFT', 'NOTION', 'DROPBOX', 'FIGMA', 'LINEAR', 'JIRA');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'AUDIT', 'PRO');

-- CreateEnum
CREATE TYPE "public"."PlaybookStatus" AS ENUM ('PENDING', 'APPROVED', 'DISMISSED', 'EXECUTING', 'EXECUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "public"."AuditLogStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."AuditLogActionType" AS ENUM ('REVOKE_ACCESS', 'DELETE_FILE', 'ARCHIVE_CHANNEL', 'ARCHIVE_PAGE', 'REMOVE_GUEST', 'REMOVE_LICENSE', 'UPDATE_PERMISSIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FileType" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'MUSIC', 'ARCHIVE', 'DATABASE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."FileStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."IntegrationSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PLAYBOOK_READY', 'RISK_DETECTED', 'AUDIT_COMPLETE', 'INTEGRATION_ERROR', 'SUBSCRIPTION_EXPIRING', 'APPROVAL_REQUIRED');

-- CreateTable
CREATE TABLE "public"."ToolIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "public"."ToolSource" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "public"."IntegrationSyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "ToolIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditResult" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "estimatedSavings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageWaste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "licenseWaste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeRisks" INTEGER NOT NULL DEFAULT 0,
    "criticalRisks" INTEGER NOT NULL DEFAULT 0,
    "moderateRisks" INTEGER NOT NULL DEFAULT 0,
    "auditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScoreTrend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "waste" DOUBLE PRECISION NOT NULL,
    "riskScore" INTEGER,
    "activeUsers" INTEGER,
    "storageUsedGb" DOUBLE PRECISION,
    "licenseCount" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Playbook" (
    "id" TEXT NOT NULL,
    "auditResultId" TEXT,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "impactType" "public"."ImpactType" NOT NULL,
    "source" "public"."ToolSource" NOT NULL,
    "itemsCount" INTEGER NOT NULL,
    "riskLevel" "public"."RiskLevel",
    "status" "public"."PlaybookStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedSavings" DOUBLE PRECISION,
    "actualSavings" DOUBLE PRECISION,
    "executedBy" TEXT,
    "executionTime" INTEGER,
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlaybookItem" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "externalId" TEXT,
    "metadata" JSONB NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlaybookItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "playbookId" TEXT,
    "userId" TEXT,
    "actionType" "public"."AuditLogActionType" NOT NULL,
    "target" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "executor" TEXT NOT NULL,
    "status" "public"."AuditLogStatus" NOT NULL,
    "details" JSONB,
    "undoActions" JSONB[],
    "undoExpiresAt" TIMESTAMP(3),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "auditResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeMb" DOUBLE PRECISION NOT NULL,
    "type" "public"."FileType" NOT NULL,
    "source" "public"."ToolSource" NOT NULL,
    "mimeType" TEXT,
    "fileHash" TEXT,
    "url" TEXT,
    "path" TEXT,
    "lastAccessed" TIMESTAMP(3),
    "ownerEmail" TEXT,
    "isPubliclyShared" BOOLEAN NOT NULL DEFAULT false,
    "sharedWith" TEXT[],
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateGroup" TEXT,
    "status" "public"."FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolIntegration_organizationId_idx" ON "public"."ToolIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "ToolIntegration_isActive_lastSyncedAt_idx" ON "public"."ToolIntegration"("isActive", "lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ToolIntegration_organizationId_source_key" ON "public"."ToolIntegration"("organizationId", "source");

-- CreateIndex
CREATE INDEX "AuditResult_organizationId_idx" ON "public"."AuditResult"("organizationId");

-- CreateIndex
CREATE INDEX "AuditResult_auditedAt_idx" ON "public"."AuditResult"("auditedAt");

-- CreateIndex
CREATE INDEX "ScoreTrend_organizationId_recordedAt_idx" ON "public"."ScoreTrend"("organizationId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreTrend_organizationId_month_key" ON "public"."ScoreTrend"("organizationId", "month");

-- CreateIndex
CREATE INDEX "Playbook_organizationId_idx" ON "public"."Playbook"("organizationId");

-- CreateIndex
CREATE INDEX "Playbook_auditResultId_idx" ON "public"."Playbook"("auditResultId");

-- CreateIndex
CREATE INDEX "Playbook_status_createdAt_idx" ON "public"."Playbook"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Playbook_impactType_status_idx" ON "public"."Playbook"("impactType", "status");

-- CreateIndex
CREATE INDEX "PlaybookItem_playbookId_idx" ON "public"."PlaybookItem"("playbookId");

-- CreateIndex
CREATE INDEX "PlaybookItem_itemType_idx" ON "public"."PlaybookItem"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_playbookId_key" ON "public"."AuditLog"("playbookId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "public"."AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_playbookId_idx" ON "public"."AuditLog"("playbookId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "File_auditResultId_idx" ON "public"."File"("auditResultId");

-- CreateIndex
CREATE INDEX "File_source_idx" ON "public"."File"("source");

-- CreateIndex
CREATE INDEX "File_fileHash_idx" ON "public"."File"("fileHash");

-- CreateIndex
CREATE INDEX "File_isDuplicate_duplicateGroup_idx" ON "public"."File"("isDuplicate", "duplicateGroup");

-- CreateIndex
CREATE INDEX "File_lastAccessed_idx" ON "public"."File"("lastAccessed");

-- CreateIndex
CREATE INDEX "Activity_organizationId_createdAt_idx" ON "public"."Activity"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "public"."Activity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_action_idx" ON "public"."Activity"("action");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "public"."Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- AddForeignKey
ALTER TABLE "public"."ToolIntegration" ADD CONSTRAINT "ToolIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditResult" ADD CONSTRAINT "AuditResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScoreTrend" ADD CONSTRAINT "ScoreTrend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Playbook" ADD CONSTRAINT "Playbook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Playbook" ADD CONSTRAINT "Playbook_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "public"."AuditResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlaybookItem" ADD CONSTRAINT "PlaybookItem_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "public"."Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "public"."Playbook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_auditResultId_fkey" FOREIGN KEY ("auditResultId") REFERENCES "public"."AuditResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
