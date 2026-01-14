# Twitter Environment Variables Setup Guide

## 📋 Overview

This document explains how to configure Twitter API credentials for the XBOT project in Vercel production environment.

---

## 🔑 Required Environment Variables

The project requires **5 Twitter environment variables** for different purposes:

### 1. **TWITTER_BEARER_TOKEN** (App-Only Authentication)
- **Purpose**: Read-only operations (searching tweets, reading timeline)
- **Type**: Bearer Token
- **Value**: `AAAAAAAAAAAAAAAAAAAAABsI5wEAAAAADWD3zOdt3zTHS9JbM1r0%2FO6HGXY%3DqQQuUc1CqOURBFjF9GcGaxkli1byzNXTKs9tGedw1sK1y3hRMb`
- **Used by**: `getBearerClient()` in `lib/twitter/client.ts`

### 2. **TWITTER_API_KEY** (OAuth 1.0a Consumer Key)
- **Purpose**: Bot posting (used with bot account credentials)
- **Type**: Consumer Key
- **Value**: `omPfOObGxBbLdalJ8ElwFT8xs`
- **Used by**: `getBotClient()` in `lib/twitter/client.ts`

### 3. **TWITTER_API_SECRET** (OAuth 1.0a Consumer Key Secret)
- **Purpose**: Bot posting (used with bot account credentials)
- **Type**: Consumer Key Secret
- **Value**: `R8b58lMRqwACvAbwahtOHWBYdK6AkSUPUeKn056FFtCvXISr9V`
- **Used by**: `getBotClient()` in `lib/twitter/client.ts`

### 4. **TWITTER_CLIENT_ID** (OAuth 2.0 Client ID)
- **Purpose**: User authentication (NextAuth)
- **Type**: OAuth 2.0 Client ID
- **Value**: `Nzl3OExveHNCc0hKUF9mR3hWZkM6MTpjaQ`
- **Used by**: NextAuth Twitter provider in `lib/auth.ts`

### 5. **TWITTER_CLIENT_SECRET** (OAuth 2.0 Client Secret)
- **Purpose**: User authentication (NextAuth)
- **Type**: OAuth 2.0 Client Secret
- **Value**: `FMEvbEHE4IVAvO2CDQm5yGnadcKxbTeSYqESTibJcmtNa1xZzM`
- **Used by**: NextAuth Twitter provider in `lib/auth.ts`

---

## 🚀 Configuration Methods

### Method 1: Automated Script (Recommended)

Run the provided script from the project root:

```bash
./configure-twitter-env-vars.sh
```

This script will:
- Remove existing variables (if any)
- Add all 5 variables to Vercel production environment
- Use `printf` to avoid trailing newlines
- Provide a summary of configured variables

---

### Method 2: Manual CLI Configuration

If the script fails, configure each variable individually:

```bash
# Set Vercel token and scope
TOKEN="8fu4bXgPHi5h9KXLTaM28UaL"
SCOPE="adminpoapfrs-projects"

# 1. TWITTER_BEARER_TOKEN
printf "AAAAAAAAAAAAAAAAAAAAABsI5wEAAAAADWD3zOdt3zTHS9JbM1r0%%2FO6HGXY%%3DqQQuUc1CqOURBFjF9GcGaxkli1byzNXTKs9tGedw1sK1y3hRMb" | \
  vercel env add TWITTER_BEARER_TOKEN production --scope "$SCOPE" --token "$TOKEN" --yes

# 2. TWITTER_API_KEY
printf "omPfOObGxBbLdalJ8ElwFT8xs" | \
  vercel env add TWITTER_API_KEY production --scope "$SCOPE" --token "$TOKEN" --yes

# 3. TWITTER_API_SECRET
printf "R8b58lMRqwACvAbwahtOHWBYdK6AkSUPUeKn056FFtCvXISr9V" | \
  vercel env add TWITTER_API_SECRET production --scope "$SCOPE" --token "$TOKEN" --yes

# 4. TWITTER_CLIENT_ID
printf "Nzl3OExveHNCc0hKUF9mR3hWZkM6MTpjaQ" | \
  vercel env add TWITTER_CLIENT_ID production --scope "$SCOPE" --token "$TOKEN" --yes

# 5. TWITTER_CLIENT_SECRET
printf "FMEvbEHE4IVAvO2CDQm5yGnadcKxbTeSYqESTibJcmtNa1xZzM" | \
  vercel env add TWITTER_CLIENT_SECRET production --scope "$SCOPE" --token "$TOKEN" --yes
```

**⚠️ Important Notes:**
- Always use `printf` (not `echo`) to avoid trailing newlines
- URL-encode special characters in Bearer Token (`%2F` for `/`, `%3D` for `=`)
- Use `--yes` flag to skip confirmation prompts

---

### Method 3: Vercel Dashboard (Web UI)

If CLI methods fail, configure manually via Vercel Dashboard:

1. **Navigate to Environment Variables**:
   ```
   https://vercel.com/adminpoapfrs-projects/xbot/settings/environment-variables
   ```

2. **For each variable**:
   - Click "Add New" button
   - Enter **Name** (e.g., `TWITTER_BEARER_TOKEN`)
   - Enter **Value** (copy from table below)
   - Select **Environment**: `Production`
   - Click "Save"

3. **Variables to add**:

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `TWITTER_BEARER_TOKEN` | `AAAAAAAAAAAAAAAAAAAAABsI5wEAAAAADWD3zOdt3zTHS9JbM1r0%2FO6HGXY%3DqQQuUc1CqOURBFjF9GcGaxkli1byzNXTKs9tGedw1sK1y3hRMb` | Production |
   | `TWITTER_API_KEY` | `omPfOObGxBbLdalJ8ElwFT8xs` | Production |
   | `TWITTER_API_SECRET` | `R8b58lMRqwACvAbwahtOHWBYdK6AkSUPUeKn056FFtCvXISr9V` | Production |
   | `TWITTER_CLIENT_ID` | `Nzl3OExveHNCc0hKUF9mR3hWZkM6MTpjaQ` | Production |
   | `TWITTER_CLIENT_SECRET` | `FMEvbEHE4IVAvO2CDQm5yGnadcKxbTeSYqESTibJcmtNa1xZzM` | Production |

---

## ✅ Verification

### Check Configuration

List all environment variables to verify:

```bash
vercel env ls --scope adminpoapfrs-projects --token 8fu4bXgPHi5h9KXLTaM28UaL
```

Expected output should show all 5 `TWITTER_*` variables.

---

## 🔒 Security Notes

### Variables NOT Configured Here

The following OAuth 1.0a credentials are **NOT** configured as environment variables:

- **Access Token**: `1460606890392629248-W0YQCu5Ua1myN4C8t3OzK1RIbWv5tL`
- **Access Token Secret**: `SWKBiEmU47HR3jV5mMKZ9DSpwtpjKAmfKHPUwQ7MCm2is`

**Why?** These credentials are specific to the bot account (Twitter ID: `1460606890392629248`) and are stored **encrypted in the database** when you connect the bot via the admin panel.

### How Bot Credentials Work

1. Admin connects bot account via `/admin` → "Bot Config" → "Connect New Bot"
2. Bot authorizes app via OAuth 1.0a
3. Access Token & Secret are encrypted using `ENCRYPTION_SECRET`
4. Encrypted credentials stored in `BotAccount` table
5. When posting, credentials are decrypted and used with `TWITTER_API_KEY` and `TWITTER_API_SECRET`

---

## 🐛 Troubleshooting

### Problem: "Could not retrieve Project Settings"

**Solution**: Remove local `.vercel` directory and run script again:

```bash
rm -rf .vercel
./configure-twitter-env-vars.sh
```

### Problem: "Permission denied" when running script

**Solution**: Make script executable:

```bash
chmod +x configure-twitter-env-vars.sh
./configure-twitter-env-vars.sh
```

### Problem: Variables not taking effect

**Solution**: Trigger a new deployment:

```bash
# Option 1: Push a commit
git commit --allow-empty -m "Trigger deployment"
git push origin main

# Option 2: Redeploy from Vercel dashboard
# Go to: https://vercel.com/adminpoapfrs-projects/xbot/deployments
# Click on latest deployment → "Redeploy"
```

---

## 📚 How Each Variable is Used

### Code References

```typescript
// 1. TWITTER_BEARER_TOKEN
// lib/twitter/client.ts:28
bearerClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// 2 & 3. TWITTER_API_KEY & TWITTER_API_SECRET
// lib/twitter/client.ts:87-92
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken,  // From database (encrypted)
  accessSecret, // From database (encrypted)
});

// 4 & 5. TWITTER_CLIENT_ID & TWITTER_CLIENT_SECRET
// lib/auth.ts:16-17
Twitter({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
})
```

---

## 🔄 Next Steps After Configuration

1. ✅ **Verify Configuration**:
   ```bash
   vercel env ls --scope adminpoapfrs-projects --token 8fu4bXgPHi5h9KXLTaM28UaL
   ```

2. ✅ **Trigger Deployment**:
   - Push a commit to `main` branch, OR
   - Redeploy from Vercel dashboard

3. ✅ **Reconnect Bot Account**:
   - Go to: `https://twitterbot.poap.studio/admin`
   - Navigate to any project → "Bot Config" tab
   - Click "Connect New Bot"
   - Authorize the bot account (Twitter ID: `1460606890392629248`)

4. ✅ **Test Webhook**:
   - Post a test tweet mentioning the bot
   - Check logs: `https://vercel.com/adminpoapfrs-projects/xbot/logs`
   - Verify bot replies successfully

---

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify all 5 variables are set correctly
3. Ensure bot account is reconnected after configuration
4. Check Twitter Developer Portal app settings

---

**Last Updated**: 2026-01-14
**Project**: xbot (POAP Twitter Bot)
**Vercel Project**: https://vercel.com/adminpoapfrs-projects/xbot
