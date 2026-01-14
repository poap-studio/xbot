-- Add webhookId to bot_accounts
ALTER TABLE "bot_accounts" ADD COLUMN "webhookId" TEXT;

-- Drop old composite unique constraint on valid_codes
ALTER TABLE "valid_codes" DROP CONSTRAINT IF EXISTS "valid_codes_code_projectId_key";

-- Add global unique constraint on code
ALTER TABLE "valid_codes" ADD CONSTRAINT "valid_codes_code_key" UNIQUE ("code");
