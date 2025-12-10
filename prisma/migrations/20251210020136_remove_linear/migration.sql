/*
  Warnings:

  - The values [LINEAR] on the enum `ToolSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ToolSource_new" AS ENUM ('SLACK', 'GOOGLE', 'MICROSOFT', 'NOTION', 'DROPBOX', 'FIGMA', 'JIRA');
ALTER TABLE "public"."ToolIntegration" ALTER COLUMN "source" TYPE "public"."ToolSource_new" USING ("source"::text::"public"."ToolSource_new");
ALTER TABLE "public"."Playbook" ALTER COLUMN "source" TYPE "public"."ToolSource_new" USING ("source"::text::"public"."ToolSource_new");
ALTER TABLE "public"."File" ALTER COLUMN "source" TYPE "public"."ToolSource_new" USING ("source"::text::"public"."ToolSource_new");
ALTER TYPE "public"."ToolSource" RENAME TO "ToolSource_old";
ALTER TYPE "public"."ToolSource_new" RENAME TO "ToolSource";
DROP TYPE "public"."ToolSource_old";
COMMIT;
