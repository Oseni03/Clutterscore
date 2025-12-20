-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "detectedUserCount" INTEGER,
ADD COLUMN     "userCountLastSync" TIMESTAMP(3),
ADD COLUMN     "userCountSource" TEXT,
ADD COLUMN     "userCountVerified" BOOLEAN NOT NULL DEFAULT false;
