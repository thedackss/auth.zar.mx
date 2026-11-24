-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "auth_event_type" ADD VALUE 'APP_AUTHORIZE';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_AUTHORIZE_DENIED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_CODE_REDEEMED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_TOKEN_REFRESHED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_REFRESH_REUSE_DETECTED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_TOKEN_REVOKED';

-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "redirect_uris" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "app_refresh_tokens" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "app_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_refresh_tokens_token_hash_key" ON "app_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "app_refresh_tokens_user_id_app_id_idx" ON "app_refresh_tokens"("user_id", "app_id");

-- CreateIndex
CREATE INDEX "app_refresh_tokens_family_id_idx" ON "app_refresh_tokens"("family_id");

-- AddForeignKey
ALTER TABLE "app_refresh_tokens" ADD CONSTRAINT "app_refresh_tokens_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_refresh_tokens" ADD CONSTRAINT "app_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
