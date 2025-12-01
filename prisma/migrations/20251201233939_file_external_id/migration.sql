-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "externalId" TEXT;

-- CreateIndex
CREATE INDEX "File_externalId_idx" ON "public"."File"("externalId");

-- CreateIndex
CREATE INDEX "File_source_externalId_idx" ON "public"."File"("source", "externalId");
