# 🚨 URGENT: Manual Migration Required

## Error
```
The column `config.poapEditCode` does not exist in the current database.
```

## Solution

You need to run this SQL migration manually in your Vercel Postgres database.

### Option 1: Via Vercel Dashboard

1. Go to https://vercel.com/alberto-g-toribios-projects/xbot
2. Click on "Storage" tab
3. Select your Postgres database
4. Click on "Query" or ".sql" tab
5. Run this SQL:

```sql
-- Add poapEditCode column
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "poapEditCode" TEXT NOT NULL DEFAULT '';

-- Set default values for existing rows
UPDATE "config" SET "poapEditCode" = '' WHERE "poapEditCode" IS NULL OR "poapEditCode" = '';
UPDATE "config" SET "poapEventId" = '' WHERE "poapEventId" IS NULL OR "poapEventId" = '';
```

6. Click "Run Query"

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Get database connection string
vercel env pull

# Connect to database and run migration
# (Use the DATABASE_URL from .env.local)
psql "YOUR_DATABASE_URL_HERE" -c "ALTER TABLE config ADD COLUMN IF NOT EXISTS poapEditCode TEXT NOT NULL DEFAULT '';"
psql "YOUR_DATABASE_URL_HERE" -c "UPDATE config SET poapEditCode = '' WHERE poapEditCode IS NULL;"
```

### Option 3: Using Prisma Migrate (Recommended for future)

```bash
# This requires DATABASE_URL in .env
npx prisma migrate deploy
```

## After Running Migration

1. Refresh your deployment: https://xbot.poap.studio
2. The error should be gone
3. Go to `/admin/poap` and configure:
   - Event ID
   - Edit Code
4. Click "Load QR Codes" button

## Verify Migration Worked

Run this SQL to verify the column exists:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'config';
```

You should see `poapEditCode` in the results.
