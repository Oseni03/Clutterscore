/*
  Warnings:

  - Made the column `subscriptionTier` on table `organization` required. This step will fail if there are existing NULL values in that column.
  - Made the column `targetScore` on table `organization` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."organization" ALTER COLUMN "subscriptionTier" SET NOT NULL,
ALTER COLUMN "targetScore" SET NOT NULL;
