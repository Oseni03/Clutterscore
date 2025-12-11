/*
  Warnings:

  - The values [DELETE_FILE] on the enum `AuditLogActionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."AuditLogActionType_new" AS ENUM ('REVOKE_ACCESS', 'ARCHIVE_FILE', 'ARCHIVE_CHANNEL', 'ARCHIVE_PAGE', 'REMOVE_GUEST', 'REMOVE_LICENSE', 'UPDATE_PERMISSIONS', 'OTHER');
ALTER TABLE "public"."AuditLog" ALTER COLUMN "actionType" TYPE "public"."AuditLogActionType_new" USING ("actionType"::text::"public"."AuditLogActionType_new");
ALTER TYPE "public"."AuditLogActionType" RENAME TO "AuditLogActionType_old";
ALTER TYPE "public"."AuditLogActionType_new" RENAME TO "AuditLogActionType";
DROP TYPE "public"."AuditLogActionType_old";
COMMIT;
