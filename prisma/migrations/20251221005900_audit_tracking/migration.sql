-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "freeAuditResetDate" TIMESTAMP(3),
ADD COLUMN     "freeAuditsThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFreeAuditDate" TIMESTAMP(3);
