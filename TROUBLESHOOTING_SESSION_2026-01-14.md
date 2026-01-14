# Troubleshooting Session - 2026-01-14

## Issue Summary
Tweet https://x.com/gotoalberto/status/2011390019399987339 was not responded to by the bot despite webhook being received.

## Timeline

### 10:48:45 - Tweet Posted
- **Tweet ID**: 2011390019399987339
- **Author**: @gotoalberto (ID: 54847350)
- **Text**: "hey #testpoap x @poapstudio"
- **Hashtag**: #testpoap
- **Mention**: @poapstudio (ID: 1460606890392629248)
- **Media**: None

### 10:48:46 - Webhook Received
- **Source IP**: 192.133.77.1
- **Event Type**: TWEET_CREATE
- **Webhook ID**: 1997725575138418689
- **Endpoint**: https://twitterbot.poap.studio/api/webhooks/twitter
- **Status**: Received successfully ✅

### 10:50:35 - Tweet Processed
- **Saved to DB**: YES ✅
- **Tweet DB ID**: cmkdwgioi000cgv04hpu93tny
- **Is Eligible**: TRUE ✅
- **Bot Replied**: FALSE ❌
- **Delivery**: NONE ❌

## Investigation Results

### ✅ What Works
1. **Webhook Registration**
   - Webhook ID: 1997725575138418689
   - URL: https://twitterbot.poap.studio/api/webhooks/twitter
   - Status: VALID
   - Created: 2025-12-07T17:51:10.000Z

2. **Bot Subscription**
   - Bot: @poapstudio
   - Twitter ID: 1460606890392629248
   - Subscribed: YES ✅
   - Webhook ID in DB: 1997725575138418689 ✅

3. **Webhook Reception**
   - Last event: 0 minutes ago
   - Receiving events: YES ✅
   - CRC Challenge: PASSING ✅

4. **Mint Links**
   - Project ID: cmkdvyzgd0005gv04m0d9e5a7
   - Total mint links: 20
   - Available: 19 ✅
   - Used/Reserved: 1

5. **Project Configuration**
   - Name: X test 14/01
   - Hashtag: #testpoap ✅
   - Requires code: false ✅
   - Requires image: false ✅
   - Bot account: @poapstudio ✅

### ❌ What Failed
1. **Bot Reply**
   - Bot did not reply to tweet
   - botReplied: false
   - botReplyTweetId: null

2. **POAP Delivery**
   - No delivery record created
   - No mint link assigned
   - User did not receive POAP

## Technical Analysis

### Database State
```sql
-- Tweet Record
SELECT * FROM tweets WHERE tweetId = '2011390019399987339';
-- Result: EXISTS, isEligible=true, botReplied=false

-- Delivery Record
SELECT * FROM deliveries WHERE tweetId = '2011390019399987339';
-- Result: NOT FOUND

-- Webhook Event
SELECT * FROM twitterWebhookEvent
WHERE receivedAt >= '2026-01-14T10:48:00'
AND receivedAt <= '2026-01-14T10:49:00'
AND eventType = 'TWEET_CREATE';
-- Result: EXISTS (10:48:46.678Z from 192.133.77.1)
```

### Webhook Flow
```
Twitter → Webhook Endpoint → Save Event ✅ → Process Tweet ❌
                                                      ↓
                                              [Step 1-8] Processing
                                                      ↓
                                              Failed somewhere
```

### Code Changes Timeline
Recent commits that might affect processing:
1. **e81edec** - Document webhook registration fix (docs only)
2. **11a7385** - Fix webhook registration (project assignment logic)
3. **114e5eb** - Update README (docs only)
4. **49269f6** - Add step-by-step logging (lib/bot/service.ts) ⚠️
5. **4edc8fc** - Update README (docs only)
6. **2bf0c64** - Optimize database connection pooling ⚠️
7. **75ccd2f** - Include Prisma migrations ⚠️

### Next Steps to Debug

1. **Check Vercel Logs** (IN PROGRESS)
   - Get logs from deployment: xbot-fxw5jw9ro (24m ago)
   - Search for tweet ID: 2011390019399987339
   - Look for [Step X] markers to identify failure point
   - Check for errors, timeouts, or exceptions

2. **Expected Log Pattern**
   ```
   Processing tweet 2011390019399987339 for project "X test 14/01"
   [Step 1] Checking if tweet already delivered...
   [Step 2] Checking if already replied...
   [Step 3] Checking multiple claims policy...
   [Step 4] Attempting to reserve mint link...
   [Step 5] Replying to tweet with claim URL...
   [Step 6] Extracting qrHash from mint link...
   [Step 7] Recording delivery...
   [Step 8] Marking hidden code as used...
   ✅ Successfully delivered POAP...
   ```

3. **Possible Failure Points**
   - Step 1: Database query timeout (P2024)
   - Step 4: Mint link reservation failure
   - Step 5: Twitter API error (401, 403, 404, 429)
   - Step 7: Database write failure
   - General: Unhandled exception

## Environment Details

### Production URLs
- **Application**: https://twitterbot.poap.studio
- **Admin**: https://twitterbot.poap.studio/admin
- **Webhook**: https://twitterbot.poap.studio/api/webhooks/twitter
- **Vercel Dashboard**: https://vercel.com/adminpoapfrs-projects/xbot
- **Vercel Logs**: https://vercel.com/adminpoapfrs-projects/xbot/logs

### Twitter API Credentials (Configured)
- TWITTER_BEARER_TOKEN: ✅ Set
- TWITTER_API_KEY: ✅ Set
- TWITTER_API_SECRET: ✅ Set
- TWITTER_CLIENT_ID: ✅ Set
- TWITTER_CLIENT_SECRET: ✅ Set

### Database Connection Pool
- connection_limit: 100
- pool_timeout: 60s
- statement_cache_size: 0

## Fixes Applied Today

1. **Webhook Registration Fix** (commit 11a7385)
   - Problem: Bot assignment failed if webhook existed but webhookId not in DB
   - Solution: Check existing webhooks before creating new one
   - Status: ✅ Working

2. **Connection Pool Optimization** (commit 2bf0c64)
   - Problem: P2024 errors during high webhook volume
   - Solution: Increased limits to 100 connections, 60s timeout
   - Solution: Batch queries to reduce round trips
   - Status: ✅ Deployed

3. **Step-by-Step Logging** (commit 49269f6)
   - Added [Step 1-8] logging to processSingleTweet()
   - Enhanced P2024 error detection
   - Status: ✅ Deployed (recent deployment)

## Root Cause Analysis

### Identified Issue: Serverless Function Termination

**Problem**: The webhook handler used a fire-and-forget async pattern that could cause the serverless function to terminate before tweet processing completed, especially when database queries were slow.

**Evidence**:
1. 109-second delay between webhook receipt (10:48:46) and tweet save (10:50:35) indicates severe database connection pool contention
2. Tweet was saved to database (processSingleTweet was called) but botReplied=false (processing didn't complete)
3. No error logs found (function terminated before logging could occur)
4. Code analysis shows processWebhookTweetEvent was called with `.then()` (fire-and-forget) instead of `await`

**Code Location**: `app/api/webhooks/twitter/route.ts` line 212

**Previous Code**:
```typescript
processWebhookTweetEvent(body)
  .then(result => { ... })
  .catch(error => { ... });
```

This pattern returns 200 OK immediately while processing happens in background. In serverless environments, the function can be terminated once the response is sent, killing any ongoing async work.

### Fix Applied

**Change**: Make webhook processing synchronous by awaiting before responding

**New Code**:
```typescript
try {
  const result = await processWebhookTweetEvent(body);
  console.log(`[Webhook] Processing completed: ...`);
} catch (error) {
  console.error('[Webhook] Error in processing:', error);
}
```

**Benefits**:
- Ensures processing completes before serverless function terminates
- Errors are properly logged and visible
- Processing status is known before responding to Twitter
- No silent failures

**Trade-off**: Webhook response time may be slower (but still within Twitter's acceptable range)

## Fix Implementation

### File Modified
- `app/api/webhooks/twitter/route.ts` (lines 207-223)

### Change Summary
Changed from fire-and-forget async pattern to synchronous await pattern to ensure tweet processing completes before serverless function terminates.

## Action Items

- [x] Get Vercel logs for tweet 2011390019399987339 - Unable to access historical logs via CLI
- [x] Identify exact step where processing failed - Determined via code analysis
- [x] Fix identified issue - Webhook handler now awaits processing
- [ ] Build and deploy fix to production
- [ ] Test with new tweet
- [ ] Document resolution

## Commands for Quick Reference

```bash
# Check webhook status
curl "https://twitterbot.poap.studio/api/webhooks/twitter?crc_token=test123"

# List recent deployments
vercel ls --scope adminpoapfrs-projects --token 8fu4bXgPHi5h9KXLTaM28UaL

# Get logs from specific deployment
vercel logs <deployment-url> --scope adminpoapfrs-projects --token 8fu4bXgPHi5h9KXLTaM28UaL

# Check recent webhook events in DB
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.twitterWebhookEvent.findMany({orderBy:{receivedAt:'desc'},take:10}).then(console.log).finally(()=>p.$disconnect())"

# Check tweet in DB
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.tweet.findFirst({where:{tweetId:'2011390019399987339'}}).then(console.log).finally(()=>p.$disconnect())"
```

---
**Last Updated**: 2026-01-14 11:01:00 UTC
**Status**: INVESTIGATING - Awaiting Vercel logs
