-- CreateEnum
CREATE TYPE "auth_event_type" AS ENUM ('SIGN_UP', 'SIGN_IN_SUCCESS', 'SIGN_IN_FAILURE', 'SIGN_OUT', 'SIGN_OUT_ALL', 'EMAIL_VERIFIED', 'PASSWORD_SET', 'PASSWORD_CHANGED', 'ROLE_CHANGED', 'ACCOUNT_DISABLED', 'ACCOUNT_ENABLED');

-- CreateTable
CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "type" "auth_event_type" NOT NULL,
    "user_id" TEXT,
    "actor_id" TEXT,
    "email" CITEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_events_user_id_created_at_idx" ON "auth_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "auth_events_type_created_at_idx" ON "auth_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "auth_events_created_at_idx" ON "auth_events"("created_at");
