# Deployment Notes - Major Refactor

## Important: Database Migration Required

This deployment includes database schema changes. After deploying to Vercel, you need to run the migration manually.

### Migration Steps:

1. Go to your Vercel project dashboard
2. Go to Storage → Your Postgres database
3. Click on "Query" or use the Vercel CLI
4. Run the following SQL:

```sql
-- Add poapEditCode field
ALTER TABLE "config" ADD COLUMN IF NOT EXISTS "poapEditCode" TEXT NOT NULL DEFAULT '';

-- Update existing configs to have default values
UPDATE "config" SET "poapEditCode" = '' WHERE "poapEditCode" IS NULL OR "poapEditCode" = '';
UPDATE "config" SET "poapEventId" = '' WHERE "poapEventId" IS NULL;
```

### After Migration:

1. Go to `/admin/poap` and configure:
   - POAP Event ID
   - Edit Code
2. Click "Load/Update QR Codes from POAP" to load QR codes
3. Go to `/admin/hidden-codes` to upload hidden codes

## What Changed:

### Removed:
- **Mint Links page** (`/admin/mint-links`) - QR codes are now loaded automatically from POAP API

### Added:
- **Hidden Codes page** (`/admin/hidden-codes`) - Manage codes users must include in tweets
- **Automatic QR loading** - Load QR codes from POAP using Event ID + Edit Code

### Updated:
- **POAP Config** - Now has Event ID and Edit Code fields
- **Bot Logic** - Now checks for hidden codes in tweets
- **Navigation** - "Mint Links" replaced with "Hidden Codes"

## New Workflow:

1. User tweets: `#YourHashtag CODE123 [image]`
2. Bot checks if CODE123 is a valid, unused hidden code
3. If valid, bot reserves a QR code and replies with mint link
4. CODE123 is marked as used
5. QR code is marked as reserved for that user

## Environment Variables:

Make sure these are set in Vercel:
- `POAP_API_KEY` - Your POAP API key (for loading QR codes)
- All other existing env vars

## Notes:

- The old `/admin/mint-links` page no longer exists - remove from any bookmarks
- Hidden codes are case-insensitive when matching in tweets
- QR code secrets are fetched from POAP's `/actions/claim-delivery` endpoint
- Each QR code load can take time (100ms delay between requests to avoid rate limits)
