/*
  Warnings:

  - You are about to drop the column `signup_whitelist` on the `app_settings` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "auth_event_type" ADD VALUE 'APP_CREATED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_UPDATED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_KEY_REGENERATED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_REVOKED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_ACCESS_GRANTED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_ACCESS_REVOKED';
ALTER TYPE "auth_event_type" ADD VALUE 'APP_TOKEN_DENIED';

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "signup_whitelist",
ALTER COLUMN "signup_enabled" SET DEFAULT false;

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" CITEXT NOT NULL,
    "url" TEXT,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_accesses" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" CITEXT,
    "granted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apps_name_key" ON "apps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "apps_key_hash_key" ON "apps"("key_hash");

-- CreateIndex
CREATE INDEX "app_accesses_user_id_idx" ON "app_accesses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_accesses_app_id_user_id_key" ON "app_accesses"("app_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_accesses_app_id_email_key" ON "app_accesses"("app_id", "email");

-- AddForeignKey
ALTER TABLE "app_accesses" ADD CONSTRAINT "app_accesses_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_accesses" ADD CONSTRAINT "app_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
