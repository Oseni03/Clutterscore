-- CreateEnum
CREATE TYPE "public"."ArchiveStatus" AS ENUM ('STAGED', 'ARCHIVED', 'RESTORED', 'DELETED');

-- CreateTable
CREATE TABLE "public"."ArchivedFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "public"."ToolSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeMb" DOUBLE PRECISION NOT NULL,
    "mimeType" TEXT,
    "storageProvider" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ArchiveStatus" NOT NULL DEFAULT 'ARCHIVED',
    "originalLocation" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchivedFile_organizationId_status_idx" ON "public"."ArchivedFile"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ArchivedFile_expiresAt_idx" ON "public"."ArchivedFile"("expiresAt");

-- CreateIndex
CREATE INDEX "ArchivedFile_source_idx" ON "public"."ArchivedFile"("source");

-- CreateIndex
CREATE INDEX "ArchivedFile_status_idx" ON "public"."ArchivedFile"("status");

-- AddForeignKey
ALTER TABLE "public"."ArchivedFile" ADD CONSTRAINT "ArchivedFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
