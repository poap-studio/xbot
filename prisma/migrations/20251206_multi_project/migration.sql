-- CreateTable: projects
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "poapEventId" TEXT NOT NULL,
    "poapEditCode" TEXT NOT NULL,
    "allowMultipleClaims" BOOLEAN NOT NULL DEFAULT false,
    "botReplyEligible" TEXT NOT NULL DEFAULT '¡Felicidades! Has compartido el código correcto. Reclama tu POAP aquí: {{claimUrl}}',
    "botReplyNotEligible" TEXT NOT NULL DEFAULT 'Gracias por tu interés. Asegúrate de incluir un código válido y una imagen en tu tweet.',
    "botReplyAlreadyClaimed" TEXT NOT NULL DEFAULT 'You have already claimed a POAP for this event. Only one claim per user is allowed.',
    "twitterHashtag" TEXT NOT NULL DEFAULT '#POAP',
    "qrPageTweetTemplate" TEXT NOT NULL DEFAULT 'I visited the POAP Studio booth at ETH Global, and here''s the proof! The secret word is {{code}} {{hashtag}}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "botAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_isActive_idx" ON "projects"("isActive");

-- AddForeignKey: projects -> bot_accounts
ALTER TABLE "projects" ADD CONSTRAINT "projects_botAccountId_fkey" FOREIGN KEY ("botAccountId") REFERENCES "bot_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 1: Create default project from existing config
INSERT INTO "projects" ("id", "name", "poapEventId", "poapEditCode", "allowMultipleClaims", "botReplyEligible", "botReplyNotEligible", "botReplyAlreadyClaimed", "twitterHashtag", "qrPageTweetTemplate", "isActive", "botAccountId", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text as id,
    COALESCE((SELECT name FROM (VALUES ('Default Project')) AS t(name)), 'Default Project') as name,
    COALESCE("poapEventId", '') as "poapEventId",
    COALESCE("poapEditCode", '') as "poapEditCode",
    COALESCE("allowMultipleClaims", false) as "allowMultipleClaims",
    COALESCE("botReplyEligible", '¡Felicidades! Has compartido el código correcto. Reclama tu POAP aquí: {{claimUrl}}') as "botReplyEligible",
    COALESCE("botReplyNotEligible", 'Gracias por tu interés. Asegúrate de incluir un código válido y una imagen en tu tweet.') as "botReplyNotEligible",
    COALESCE("botReplyAlreadyClaimed", 'You have already claimed a POAP for this event. Only one claim per user is allowed.') as "botReplyAlreadyClaimed",
    COALESCE("twitterHashtag", '#POAP') as "twitterHashtag",
    COALESCE("qrPageTweetTemplate", 'I visited the POAP Studio booth at ETH Global, and here''s the proof! The secret word is {{code}} {{hashtag}}') as "qrPageTweetTemplate",
    true as "isActive",
    "botAccountId",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "config"
LIMIT 1;

-- Store the project ID for later use
DO $$
DECLARE
    default_project_id TEXT;
BEGIN
    SELECT id INTO default_project_id FROM "projects" LIMIT 1;

    -- Step 2: Add projectId column to valid_codes (nullable first)
    ALTER TABLE "valid_codes" ADD COLUMN "projectId" TEXT;

    -- Set all existing records to default project
    UPDATE "valid_codes" SET "projectId" = default_project_id;

    -- Make it required
    ALTER TABLE "valid_codes" ALTER COLUMN "projectId" SET NOT NULL;

    -- Step 3: Add projectId column to qr_codes
    ALTER TABLE "qr_codes" ADD COLUMN "projectId" TEXT;
    UPDATE "qr_codes" SET "projectId" = default_project_id;
    ALTER TABLE "qr_codes" ALTER COLUMN "projectId" SET NOT NULL;

    -- Step 4: Add projectId column to deliveries
    ALTER TABLE "deliveries" ADD COLUMN "projectId" TEXT;
    UPDATE "deliveries" SET "projectId" = default_project_id;
    ALTER TABLE "deliveries" ALTER COLUMN "projectId" SET NOT NULL;

    -- Step 5: Add projectId column to tweets
    ALTER TABLE "tweets" ADD COLUMN "projectId" TEXT;
    UPDATE "tweets" SET "projectId" = default_project_id;
    ALTER TABLE "tweets" ALTER COLUMN "projectId" SET NOT NULL;
END $$;

-- Step 6: Drop old unique constraints
ALTER TABLE "valid_codes" DROP CONSTRAINT IF EXISTS "valid_codes_code_key";
ALTER TABLE "qr_codes" DROP CONSTRAINT IF EXISTS "qr_codes_qrHash_key";
ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_tweetId_key";
ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_qrHash_key";
ALTER TABLE "tweets" DROP CONSTRAINT IF EXISTS "tweets_tweetId_key";

-- Step 7: Create new composite unique constraints
ALTER TABLE "valid_codes" ADD CONSTRAINT "valid_codes_code_projectId_key" UNIQUE ("code", "projectId");
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_qrHash_projectId_key" UNIQUE ("qrHash", "projectId");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_tweetId_projectId_key" UNIQUE ("tweetId", "projectId");
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_qrHash_projectId_key" UNIQUE ("qrHash", "projectId");
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_tweetId_projectId_key" UNIQUE ("tweetId", "projectId");

-- Step 8: Create indices on projectId
CREATE INDEX "valid_codes_projectId_idx" ON "valid_codes"("projectId");
CREATE INDEX "qr_codes_projectId_idx" ON "qr_codes"("projectId");
CREATE INDEX "deliveries_projectId_idx" ON "deliveries"("projectId");
CREATE INDEX "tweets_projectId_idx" ON "tweets"("projectId");

-- Step 9: Add foreign keys
ALTER TABLE "valid_codes" ADD CONSTRAINT "valid_codes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tweets" ADD CONSTRAINT "tweets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Update bot_accounts relation (remove old config relation)
ALTER TABLE "config" DROP CONSTRAINT IF EXISTS "config_botAccountId_fkey";
ALTER TABLE "config" DROP COLUMN IF EXISTS "botAccountId";

-- Step 11: Clean up config table (remove fields that moved to projects)
ALTER TABLE "config" DROP COLUMN IF EXISTS "poapEventId";
ALTER TABLE "config" DROP COLUMN IF EXISTS "poapEditCode";
ALTER TABLE "config" DROP COLUMN IF EXISTS "allowMultipleClaims";
ALTER TABLE "config" DROP COLUMN IF EXISTS "botReplyEligible";
ALTER TABLE "config" DROP COLUMN IF EXISTS "botReplyNotEligible";
ALTER TABLE "config" DROP COLUMN IF EXISTS "botReplyAlreadyClaimed";
ALTER TABLE "config" DROP COLUMN IF EXISTS "twitterHashtag";
ALTER TABLE "config" DROP COLUMN IF EXISTS "qrPageTweetTemplate";
