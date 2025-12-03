-- AlterTable
ALTER TABLE "public"."organization" ADD COLUMN     "subscriptionTier" TEXT DEFAULT 'free',
ADD COLUMN     "tagetScore" INTEGER DEFAULT 75;

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "public"."account"("userId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "public"."session"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "public"."verification"("identifier");
