# Production Environment Variables Setup for XBOT

## Overview

This document lists all required environment variables for deploying XBOT to production on Vercel.

**Production Domain:** `xbot.poap.studio`
**Vercel Project:** `https://vercel.com/alberto-g-toribios-projects/xbot`

---

## Required Environment Variables

### Database Configuration

```bash
# PostgreSQL database connection string
# Format: postgresql://user:password@host:port/database?schema=public
printf "postgresql://..." | vercel env add DATABASE_URL production
```

---

### POAP API Configuration

```bash
# POAP OAuth Client ID
printf "your-poap-client-id" | vercel env add POAP_CLIENT_ID production

# POAP OAuth Client Secret
printf "your-poap-client-secret" | vercel env add POAP_CLIENT_SECRET production

# POAP API Key
printf "your-poap-api-key" | vercel env add POAP_API_KEY production
```

**Where to get these:**
- POAP API credentials: https://poap.tech/developers
- Contact POAP team for API access

---

### Twitter API Configuration (Read-Only)

```bash
# Twitter API Bearer Token (for read-only operations)
printf "your-twitter-bearer-token" | vercel env add TWITTER_BEARER_TOKEN production

# Twitter API Key (for app authentication)
printf "your-twitter-api-key" | vercel env add TWITTER_API_KEY production

# Twitter API Secret
printf "your-twitter-api-secret" | vercel env add TWITTER_API_SECRET production

# Twitter OAuth 2.0 Client ID (for user login)
printf "your-twitter-client-id" | vercel env add TWITTER_CLIENT_ID production

# Twitter OAuth 2.0 Client Secret
printf "your-twitter-client-secret" | vercel env add TWITTER_CLIENT_SECRET production
```

**Where to get these:**
- Twitter Developer Portal: https://developer.twitter.com/en/portal/dashboard
- Create a new app or use existing app credentials

**Note:** For bot posting, you'll also need OAuth 1.0a credentials stored encrypted in the database via the admin panel.

---

### NextAuth Configuration

```bash
# NextAuth URL (production domain)
printf "https://xbot.poap.studio" | vercel env add NEXTAUTH_URL production

# NextAuth Secret (generate a random secure string)
# Generate with: openssl rand -base64 32
printf "$(openssl rand -base64 32)" | vercel env add NEXTAUTH_SECRET production
```

---

### Application URLs

```bash
# Public application URL (must match NEXTAUTH_URL)
printf "https://xbot.poap.studio" | vercel env add NEXT_PUBLIC_APP_URL production
```

---

### Security & Authentication

```bash
# Admin dashboard password
printf "your-secure-admin-password" | vercel env add ADMIN_PASSWORD production

# Cron job authentication secret (generate random)
printf "$(openssl rand -hex 32)" | vercel env add CRON_SECRET production

# Encryption secret for storing OAuth credentials (generate random)
printf "$(openssl rand -hex 32)" | vercel env add ENCRYPTION_SECRET production
```

---

## Complete Setup Script

```bash
#!/bin/bash
# Setup all production environment variables for XBOT

# Navigate to project directory
cd /Users/albertogomeztoribio/git/xbot

# Database
printf "postgresql://USER:PASS@HOST:PORT/DB" | vercel env add DATABASE_URL production

# POAP API
printf "YOUR_POAP_CLIENT_ID" | vercel env add POAP_CLIENT_ID production
printf "YOUR_POAP_CLIENT_SECRET" | vercel env add POAP_CLIENT_SECRET production
printf "YOUR_POAP_API_KEY" | vercel env add POAP_API_KEY production

# Twitter API (Read-only)
printf "YOUR_TWITTER_BEARER_TOKEN" | vercel env add TWITTER_BEARER_TOKEN production
printf "YOUR_TWITTER_API_KEY" | vercel env add TWITTER_API_KEY production
printf "YOUR_TWITTER_API_SECRET" | vercel env add TWITTER_API_SECRET production

# Twitter OAuth 2.0 (User login)
printf "YOUR_TWITTER_CLIENT_ID" | vercel env add TWITTER_CLIENT_ID production
printf "YOUR_TWITTER_CLIENT_SECRET" | vercel env add TWITTER_CLIENT_SECRET production

# NextAuth
printf "https://xbot.poap.studio" | vercel env add NEXTAUTH_URL production
printf "$(openssl rand -base64 32)" | vercel env add NEXTAUTH_SECRET production

# Application URL
printf "https://xbot.poap.studio" | vercel env add NEXT_PUBLIC_APP_URL production

# Security
printf "YOUR_ADMIN_PASSWORD" | vercel env add ADMIN_PASSWORD production
printf "$(openssl rand -hex 32)" | vercel env add CRON_SECRET production
printf "$(openssl rand -hex 32)" | vercel env add ENCRYPTION_SECRET production

echo "✅ All environment variables configured!"
```

---

## Environment Variable Summary Table

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `DATABASE_URL` | Secret | ✅ | PostgreSQL connection string |
| `POAP_CLIENT_ID` | Secret | ✅ | POAP OAuth client ID |
| `POAP_CLIENT_SECRET` | Secret | ✅ | POAP OAuth client secret |
| `POAP_API_KEY` | Secret | ✅ | POAP API authentication key |
| `TWITTER_BEARER_TOKEN` | Secret | ✅ | Twitter API bearer token (read-only) |
| `TWITTER_API_KEY` | Secret | ✅ | Twitter API key |
| `TWITTER_API_SECRET` | Secret | ✅ | Twitter API secret |
| `TWITTER_CLIENT_ID` | Secret | ✅ | Twitter OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | Secret | ✅ | Twitter OAuth 2.0 client secret |
| `NEXTAUTH_URL` | Public | ✅ | Application URL (https://xbot.poap.studio) |
| `NEXTAUTH_SECRET` | Secret | ✅ | NextAuth encryption secret |
| `NEXT_PUBLIC_APP_URL` | Public | ✅ | Public app URL (https://xbot.poap.studio) |
| `ADMIN_PASSWORD` | Secret | ✅ | Admin dashboard password |
| `CRON_SECRET` | Secret | ✅ | Cron job authentication token |
| `ENCRYPTION_SECRET` | Secret | ✅ | Database credential encryption key |

---

## Verification

After setting all environment variables, verify with:

```bash
# List all production environment variables (values hidden)
vercel env ls production

# Pull production variables to local .env file (for testing)
vercel env pull .env.production.local
```

---

## Important Notes

### 🔒 Security

1. **NEVER commit these values to git**
2. **Use `printf` not `echo`** to avoid trailing newlines
3. **Generate secure random values** for secrets using `openssl rand`
4. **Rotate secrets regularly** (every 90 days recommended)

### 🔄 Updating Variables

To update an existing variable:

```bash
# Remove old value
vercel env rm VARIABLE_NAME production

# Add new value
printf "new-value" | vercel env add VARIABLE_NAME production

# Or use update (if available in your Vercel CLI version)
printf "new-value" | vercel env update VARIABLE_NAME production
```

### 🚀 Deployment

After setting environment variables:

```bash
# Trigger a new deployment
vercel --prod

# Or push to main branch to trigger auto-deployment
git push origin main
```

### 🔍 Troubleshooting

**Build fails with "Missing environment variable":**
- Verify variable is set: `vercel env ls production`
- Check variable name matches exactly (case-sensitive)
- Ensure no trailing spaces or newlines

**Database connection fails:**
- Verify `DATABASE_URL` format is correct
- Test connection from local machine
- Check database firewall allows Vercel IPs

**Twitter API errors:**
- Verify Twitter app has correct permissions
- Check API keys are for the correct app
- Ensure OAuth callback URLs include `https://xbot.poap.studio/api/auth/callback/twitter`

**POAP API errors:**
- Verify POAP credentials are active
- Check API key has correct scopes
- Test POAP OAuth flow separately

---

## Additional Configuration

### Vercel Project Settings

Ensure these settings are configured in Vercel dashboard:

1. **Custom Domain:** `xbot.poap.studio`
2. **Build Command:** `npm run build`
3. **Output Directory:** `.next`
4. **Install Command:** `npm install`
5. **Framework Preset:** Next.js

### Cron Jobs

Configure in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-tweets",
      "schedule": "* * * * *"
    }
  ]
}
```

**Note:** Cron jobs require `CRON_SECRET` header for authentication.

### Database Migrations

After deployment, run migrations:

```bash
# Connect to production database
vercel env pull .env.production.local
export DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d '=' -f2-)

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Environment-Specific Variables

### Development

For local development, create `.env.local`:

```bash
DATABASE_URL="postgresql://localhost:5432/xbot_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# ... other variables
```

### Preview (Vercel Deployments)

For preview deployments, configure separate variables:

```bash
vercel env add VARIABLE_NAME preview
```

---

## Quick Reference Commands

```bash
# List all production variables
vercel env ls production

# Pull production variables to .env.production.local
vercel env pull .env.production.local

# Set a variable for all environments
vercel env add VARIABLE_NAME production preview development

# Remove a variable
vercel env rm VARIABLE_NAME production

# Deploy to production
vercel --prod

# View deployment logs
vercel logs xbot.poap.studio

# Check deployment status
vercel inspect xbot.poap.studio
```

---

**Last Updated:** 2025-12-06
**Maintained By:** @gotoalberto
**Project:** XBOT (POAP Twitter Bot)
