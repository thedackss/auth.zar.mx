-- CreateEnum
CREATE TYPE "role" AS ENUM ('USER', 'ADMIN');

-- Replace account_type/employee_role with a single role column,
-- preserving existing admins.
ALTER TABLE "users" ADD COLUMN "role" "role" NOT NULL DEFAULT 'USER';
UPDATE "users" SET "role" = 'ADMIN' WHERE "employee_role" = 'ADMIN';
ALTER TABLE "users" DROP COLUMN "account_type";
ALTER TABLE "users" DROP COLUMN "employee_role";

-- DropEnum
DROP TYPE "account_type";
DROP TYPE "employee_role";

-- Account disabling
ALTER TABLE "users" ADD COLUMN "disabled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "signup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "signup_whitelist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
