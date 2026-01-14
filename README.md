# POAP Twitter Bot

Automated bot that delivers POAP mint links to Twitter users who post eligible tweets.

**Production:** [https://twitterbot.poap.studio](https://twitterbot.poap.studio)
**Repository:** [https://github.com/poap-studio/xbot](https://github.com/poap-studio/xbot)
**Deployment:** Vercel ([Dashboard](https://vercel.com/adminpoapfrs-projects/xbot))

## 🚀 Features

- **Real-time Webhook Processing**: Instant POAP delivery via Twitter Account Activity webhooks (no polling!)
- **Mention-based Detection**: Users mention bot accounts with unique codes instead of hashtags
- **Multi-Project Bot Support**: One bot can serve multiple projects, identified by globally unique codes
- **Automatic Webhook Management**: Webhooks created/deleted automatically when assigning/removing bots
- **POAP Delivery**: Reserves and delivers unique mint links to eligible users
- **Dynamic QR Code Generation**: Generate QR codes with secret codes that redirect to Twitter with pre-filled tweets
- **Web Claim Interface**: Twitter OAuth login to view and claim POAPs
- **Admin Dashboard**: Configure bot settings, view statistics, and export delivery data with organized tabs
- **Per-Project Bot Configuration**: Assign specific bot accounts to different projects for organized reply management

## 🏗️ Architecture

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: NextAuth.js with Twitter OAuth 2.0
- **APIs**: Twitter API v2 (Account Activity & OAuth 1.0a) + POAP API
- **Real-time Processing**: Twitter Account Activity webhooks
- **Hosting**: Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (AWS RDS recommended)
- Twitter Developer Account with API credentials
- POAP API credentials
- Vercel account (for deployment)

## 🛠️ Setup

### 1. Clone Repository

```bash
git clone https://github.com/poap-studio/xbot.git
cd xbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/xbot"

# POAP API
POAP_CLIENT_ID="your_client_id"
POAP_CLIENT_SECRET="your_client_secret"
POAP_API_KEY="your_api_key"

# Twitter API
TWITTER_API_KEY="your_api_key"
TWITTER_API_SECRET="your_api_secret"
TWITTER_ACCESS_TOKEN="your_access_token"
TWITTER_ACCESS_SECRET="your_access_secret"
TWITTER_BEARER_TOKEN="your_bearer_token"

# Twitter OAuth (for user login)
TWITTER_CLIENT_ID="your_oauth_client_id"
TWITTER_CLIENT_SECRET="your_oauth_client_secret"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_with_openssl_rand_base64_32"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Admin
ADMIN_PASSWORD="your_admin_password"

# Encryption (for storing bot credentials)
ENCRYPTION_SECRET="generate_with_openssl_rand_hex_64"
```

### 4. Setup Database

Run Prisma migrations:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## 🚢 Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login and link project:
```bash
vercel login
vercel link
```

3. Add environment variables:
```bash
vercel env add DATABASE_URL
vercel env add POAP_CLIENT_ID
# ... add all other env vars
```

4. Deploy:
```bash
vercel --prod
```

**Note**: Webhooks are automatically managed when you assign/remove bot accounts to projects. No manual webhook configuration needed!

## 📖 Usage

### Admin Configuration

1. Navigate to `/admin`
2. Configure project settings in organized tabs:
   - **General**: Project name, Twitter hashtag, POAP event settings, dynamic QR code
   - **Bot Config**: Select bot account, configure hashtags and reply templates
   - **Mint Links**: Configure POAP event, load mint links, set claim settings

#### Bot Account Management

The system supports multiple Twitter bot accounts with per-project configuration:

1. **Connect a New Bot**:
   - Go to any project's "Bot Config" tab
   - Click "Connect New Bot"
   - Authorize the Twitter account via OAuth 1.0a
   - The bot will be available for all projects

2. **Assign Bot to Project**:
   - In the "Bot Config" tab, select a bot from the dropdown
   - The selected bot will be used exclusively for that project's replies
   - If no bot is selected, the system uses any available bot

3. **Bot Account Features**:
   - OAuth 1.0a authentication with encrypted credential storage
   - View connected bots with profile images and usernames
   - See how many projects each bot is assigned to
   - Reconnect bots if credentials expire

### User Flows

#### Flow 1: Tweet-based POAP Claim (Real-time via Webhooks)
1. User posts a tweet with:
   - **Mention to bot account** (e.g., @poapstudio)
   - **Unique code** (e.g., "A3B7K")
   - **Project hashtag** (e.g., #POAP)
   - **Image attachment**
2. Twitter webhook instantly notifies our system about the mention
3. System validates:
   - Tweet contains the required project hashtag (if not, tweet is ignored without response)
   - Code belongs to an active project
   - Bot account matches the project
   - Tweet has required image (if missing but has hashtag, bot replies with error message)
4. Bot reserves a mint link and replies to tweet with claim URL
5. User visits claim URL and logs in with Twitter
6. User sees their mint link and claims POAP

#### Flow 2: QR Code POAP Claim
1. Admin generates QR code with secret code in admin dashboard
2. User scans QR code (typically at event booth)
3. QR redirects to Twitter app with pre-filled tweet containing:
   - Mention to bot account
   - Secret code
   - Hashtag (for tracking)
4. User posts the tweet
5. Webhook instantly triggers POAP delivery via bot reply
6. User claims POAP from mint link

**Key Difference from v1**: No more polling! Webhooks provide instant delivery (< 1 second) vs up to 60 seconds with cron-based polling.

## 📁 Project Structure

```
xbot/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # NextAuth
│   │   ├── claim/        # User claim endpoints
│   │   ├── qr/           # QR code generation & tracking
│   │   └── webhooks/     # Twitter webhook handler
│   ├── claim/            # Claim page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # React components
│   └── admin/            # Admin components
├── lib/                   # Core logic
│   ├── bot/              # Bot processor
│   ├── poap/             # POAP API client
│   ├── twitter/          # Twitter API client & webhook processor
│   └── prisma.ts         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
├── scripts/               # Utility scripts
│   ├── register-webhook.ts
│   ├── subscribe-webhook.ts
│   └── view-webhook-events.ts
├── e2e/                   # E2E tests
└── vercel.json           # Vercel configuration
```

## 🔧 Development

### Database Management

```bash
# Open Prisma Studio
npm run prisma:studio

# Create migration
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### Recent Changes

#### Automatic Bot Account Validation and Cleanup (2026-01-14)
Implemented automatic validation and cleanup of invalid bot accounts:
- **Feature**: Bot accounts are automatically validated when loading the bot selection dropdown
- **Feature**: Invalid or disconnected bot accounts are automatically deleted from database
- **Enhancement**: Added detailed logging for bot account validation and deletion
- **Script**: New `delete-all-bot-accounts.ts` script for manual cleanup
- **API Enhancement**: `/api/admin/bot-accounts` now validates credentials via Twitter API v2
- **User Experience**: Only valid, working bot accounts appear in the selection dropdown
- **Validation**: Each bot account's OAuth credentials are verified by calling Twitter API `v2.me()`
- **Auto-cleanup**: Accounts with revoked or invalid credentials are removed automatically
- **Response**: API now returns `deleted` count and `deletedAccounts` array for transparency
- **Impact**: Prevents webhook failures due to invalid bot credentials
- **Files**:
  - `scripts/delete-all-bot-accounts.ts` (new manual cleanup script)
  - `app/api/admin/bot-accounts/route.ts` (added validation and auto-delete logic)

#### Fixed Connection Pool Exhaustion in Serverless (2026-01-14)
Fixed critical database connection pool exhaustion issue causing webhook failures:
- **Bug Fix**: Connection pool timeout errors (P2024) during webhook processing
- **Root Cause**: Default connection limit (5) too low for serverless environment with concurrent requests
- **Solution**: Increased connection_limit from 5 to 10 per lambda instance
- **Solution**: Increased pool_timeout from 10s to 20s to handle high load
- **Enhancement**: Automatic injection of optimized connection pool parameters to DATABASE_URL
- **Enhancement**: Added detailed logging for connection pool errors with diagnostic information
- **Enhancement**: Added try-catch wrapper in webhook processor to detect and log P2024 errors
- **Impact**: Webhooks now process reliably under high load without connection timeouts
- **Technical**: Connection parameters are automatically added if not present in DATABASE_URL
- **Files**:
  - `lib/prisma.ts` (added getOptimizedDatabaseUrl() and datasources config)
  - `lib/twitter/webhook-processor.ts` (added connection pool error detection)

#### Enhanced Webhook Logging (2026-01-14)
Improved logging for Twitter webhook events to facilitate debugging and monitoring:
- **Enhancement**: Added timestamp (ISO format) to all webhook log entries
- **Enhancement**: Added full webhook payload logging (first 2000 chars to avoid log bloat)
- **Enhancement**: Added detailed tweet information logging for TWEET_CREATE events (ID, author, text preview, hashtags, media)
- **Enhancement**: Added IP address, user agent, and origin logging for all webhook requests
- **Enhancement**: Added X-Twitter-Webhooks-Signature header logging for security validation
- **Enhancement**: Added CRC token preview logging (first 20 chars) for CRC validation requests
- **Enhancement**: Added full URL logging for both GET (CRC) and POST (events) requests
- **Enhancement**: Added number of tweets in event and bot account ID logging
- **Purpose**: Easier troubleshooting of webhook reception, tweet processing, and POAP delivery issues
- **Files**:
  - `app/api/webhooks/twitter/route.ts` (enhanced logging in GET and POST handlers)

#### Hashtag-First Webhook Processing Logic (2025-12-07)
Rewrote webhook processor to match projects by hashtag first (critical bug fix):
- **Bug Fix**: Tweets with hashtag but missing code/image were being ignored instead of receiving error replies
- **Logic Change**: Now searches projects by hashtag FIRST, then validates requirements per project
- **Feature**: Single tweet can now trigger multiple POAP drops for different projects with same hashtag
- **Flow**:
  1. Extract hashtags from tweet
  2. Find ALL projects matching any tweet hashtag
  3. Skip tweet if no projects match (no response)
  4. For EACH matching project:
     - Find valid code for that specific project
     - Validate code requirement → reply with error template if required but missing
     - Validate image requirement → reply with error template if required but missing
     - Check if user already claimed → reply with "already claimed" template if applicable
     - Process POAP delivery if all requirements met
- **Impact**: Ensures no eligible tweets are missed and all validation errors receive proper responses
- **Multi-Drop**: Supports scenarios where one tweet triggers POAPs for multiple events
- **Files**:
  - `lib/twitter/webhook-processor.ts` (complete rewrite of project matching logic)

#### Project-Specific Bot Reply Templates (2025-12-07)
Fixed critical bug where bot reply messages used templates from wrong project:
- **Bug Fix**: All reply template functions now accept optional `projectId` parameter
- **Bug Fix**: Updated `generateReplyText()` to use specific project's success template
- **Bug Fix**: Updated `generateAlreadyClaimedText()` to use specific project's "already claimed" template
- **Bug Fix**: Updated `generateNotEligibleText()` to prioritize specific project template
- **Backend**: Modified `replyWithClaimUrl()`, `replyWithAlreadyClaimed()`, and `replyWithNotEligible()` to pass projectId
- **Backend**: Updated `processSingleTweet()` to pass projectId when calling reply functions
- **Impact**: Multi-project setups now correctly use each project's configured message templates instead of first active project
- **Files**:
  - `lib/twitter/reply.ts` (updated all reply template generation functions)
  - `lib/bot/service.ts` (pass projectId to reply functions)

#### Theme Color Update (2025-12-07)
Changed application color scheme from pink/purple to blue:
- **Design**: Primary color changed from `#eac9f8` (soft pink/purple) to `#46b2f8` (soft blue)
- **Design**: Updated light variant to `#6dc5ff` and dark variant to `#2a9fe6`
- **Design**: Updated button hover box-shadow to use blue rgba values
- **Files**:
  - `lib/theme.ts` (palette colors and component styles)

#### Webhook Debugging Tools (2025-12-07)
Added diagnostic scripts for troubleshooting webhook and tweet processing issues:
- **Tool**: `scripts/subscribe-bot-to-webhook.ts` - Subscribe bot account to webhook using OAuth 1.0a
- **Tool**: `scripts/check-webhook.ts` - Comprehensive webhook and bot configuration diagnostic
- **Tool**: `scripts/check-webhook-detail.ts` - View detailed webhook event information
- **Tool**: `scripts/analyze-tweet-event.ts` - Analyze specific tweet processing including code validation
- **Tool**: `scripts/monitor-webhook-events.ts` - Real-time webhook event monitoring (polls every 2s)
- **Purpose**: These scripts help debug webhook subscription, tweet processing, and POAP delivery issues
- **Files**: All scripts located in `/scripts/` directory

#### Improved Project Creation UX (2025-12-07)
Streamlined project creation workflow in admin dashboard:
- **UX**: "New Project" button now hidden when no projects exist (reduces confusion)
- **UX**: "Create Project" button now auto-creates project and redirects to edit page
- **Removed**: `/admin/projects/new` route no longer exists
- **Behavior**: Clicking "Create Project" instantly creates a project with auto-generated name and default values
- **Navigation**: Redirects immediately to project edit page for configuration
- **Files**:
  - `app/admin/page.tsx` (updated UI logic and added handleCreateProject function)
  - `app/admin/projects/new/` (removed directory entirely)

#### Optional Validation Requirements (2025-12-07)
Implemented configurable validation requirements for POAP delivery:
- **Feature**: "Require Unique Code" checkbox in General settings (enabled by default)
- **Feature**: "Require Image" checkbox in General settings (enabled by default)
- **Logic**: If "Require Unique Code" is disabled → POAPs delivered to any tweet with bot mention + hashtag (no code validation)
- **Logic**: If "Require Image" is disabled → POAPs delivered without image requirement
- **Always Required**: Bot mention + project hashtag
- **Configuration**: Both settings managed in General tab with auto-save functionality
- **Backend**: Enhanced webhook processor to handle dynamic validation based on project settings
- **Backend**: Project matching now supports both code-based and hashtag-based identification
- **Files**:
  - `prisma/schema.prisma` (added requireUniqueCode and requireImage fields)
  - `app/admin/projects/[id]/page.tsx` (added UI controls in General tab)
  - `lib/twitter/webhook-processor.ts` (dynamic validation logic)

#### Hashtag Validation for Tweet Processing (2025-12-07)
Implemented hashtag requirement for tweet processing with conditional response logic:
- **Feature**: Tweets must now contain the project's configured hashtag to be processed
- **Logic**: If tweet lacks hashtag → ignored completely (no bot response)
- **Logic**: If tweet has hashtag but missing other requirements (image/code) → bot replies with error message
- **Logic**: If tweet has hashtag, code, and image → normal POAP delivery
- **Configuration**: Hashtag is configured per-project in Bot Config section
- **Template Update**: Updated default QR page tweet template to include `{{bot}}` variable
- **Backend**: Updated `processWebhookTweetEvent` to validate hashtag before processing
- **Backend**: Enhanced `replyWithNotEligible` to accept `projectId` for per-project error messages
- **Files**:
  - `lib/twitter/webhook-processor.ts` (hashtag validation logic)
  - `lib/twitter/reply.ts` (project-specific error messages)
  - `lib/bot/service.ts` (updated processNotEligibleTweet signature)
  - `prisma/schema.prisma` (updated default qrPageTweetTemplate)

#### Tweet Template Variables Documentation (2025-12-07)
Enhanced documentation for tweet template variables in admin interface:
- **Documentation**: Added `{{code}}` and `{{bot}}` variables to Project Detail page template help text
- **Enhancement**: Updated helperText for "Tweet Template for QR Page" field to show all available placeholders
- **Clarity**: Separated documentation for QR Page Tweet Template (`{{code}}`, `{{bot}}`, `{{hashtag}}`) from Bot Reply Templates (`{username}`, `{link}`, `{hashtag}`)
- **Context**: Variables were already working in backend but not documented in Project Config UI
- **Files**: `app/admin/projects/[id]/page.tsx` lines 600, 605-625

#### Multi-Bot Account Management (2025-12-07)
Implemented comprehensive bot account management system for per-project bot configuration:
- **Feature**: Connect multiple Twitter bot accounts via OAuth 1.0a
- **Feature**: Assign specific bot accounts to individual projects
- **API**: New endpoint `GET /api/admin/bot-accounts` to list all connected bots
- **UI**: Bot selection dropdown in Bot Config tab with "Connect New Bot" button
- **Security**: OAuth credentials encrypted in database using `ENCRYPTION_SECRET`
- **Logic**: Updated `getBotClient()` to use project-specific bot when available
- **Logic**: Reply functions now use the bot assigned to each project
- **Database**: Existing `BotAccount` model with encrypted `accessToken` and `accessSecret`
- **Files**:
  - `app/api/admin/bot-accounts/route.ts` (new)
  - `app/admin/projects/[id]/page.tsx` (Bot Config tab updated)
  - `lib/twitter/client.ts` (getBotClient with botAccountId param)
  - `lib/twitter/reply.ts` (reply functions with botAccountId param)
  - `lib/bot/service.ts` (uses project's botAccountId)

#### Admin UI Reorganization (2025-12-07)
Improved project detail page organization for better UX:
- **Change**: Moved "Dynamic QR Code" section from standalone card to General tab
- **Enhancement**: Removed redundant "Open Dynamic QR Page" button from Mint Links section
- **Improvement**: Updated button text to "Load/Refresh Mint Links from POAP API" for clarity
- **UX Enhancement**: Auto-save for "Allow Multiple Claims" setting (updates on toggle)
- **UX Enhancement**: Auto-save for "Active" setting in General tab (updates on toggle)
- **Organization**: Moved "Actions" card above "Claim Settings" in Mint Links tab
- **Cleanup**: Removed all "Save" buttons - settings save automatically on change
- **Files**: `app/admin/projects/[id]/page.tsx`

#### QR Code Twitter Redirect Fix (2025-12-07)
Fixed critical bug where QR code scanning opened Twitter but didn't pre-fill tweet text:
- **Issue**: Used incorrect deep link syntax `twitter://post?message=...`
- **Fix**: Changed to correct syntax `twitter://post?text=...` in `app/api/qr/track/route.ts:90`
- **Enhancement**: Implemented mobile-first redirect strategy with 1-second fallback and visibility detection
- **Files**: `app/api/qr/track/route.ts`

#### Documentation Workflow Requirement (2025-12-07)
Added mandatory documentation requirement to development workflow:
- **Requirement**: All project changes must be documented in README.md
- **Process**: After each feature/fix, review entire README for coherence
- **Files**: `.claude/CLAUDE.md` lines 80-95, 104

#### Project Default Values Fix (2025-12-07)
Fixed project creation to properly use Prisma schema default values:
- **Issue**: Default values for bot replies and QR tweet template were not being applied
- **Fix**: Modified project creation to use Prisma schema @default values instead of hardcoded fallbacks
- **Impact**: New projects now automatically get proper Spanish default messages and QR tweet template
- **Files**: `app/api/admin/projects/route.ts` lines 125-141

## 📝 API Routes

### Public Routes
- `GET /api/deliveries` - Get user's deliveries (requires auth)
- `GET /api/qr/generate?projectId=XXX` - Generate QR code with secret code
- `GET /api/qr/track?code=XXX&projectId=YYY` - Track QR scan and redirect to Twitter
- `GET /api/qr/sse?projectId=XXX` - Server-Sent Events for real-time QR updates

### Admin Routes (requires auth)
- `GET /api/admin/config` - Get bot configuration
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/deliveries` - Get all deliveries
- `GET /api/admin/deliveries/csv` - Download CSV
- `GET /api/admin/bot-accounts` - List all connected bot accounts
- `GET /api/admin/projects` - List all projects
- `GET /api/admin/projects/[id]` - Get project details
- `PATCH /api/admin/projects/[id]` - Update project (including botAccountId)

### System Routes
## 🔗 Twitter Webhooks

### How it Works

The system uses Twitter's Account Activity API to receive real-time webhook events:

1. **Automatic Webhook Management**:
   - When you assign a bot to a project (first time), a webhook is automatically registered with Twitter
   - When a bot is removed from all projects, its webhook is automatically deleted
   - No manual configuration needed!

2. **Event Processing**:
   - Twitter sends POST requests to `/api/webhooks/twitter` when users mention the bot
   - System validates the mention contains a valid code and image
   - Identifies the project by the globally unique code
   - Processes the POAP delivery instantly

3. **Webhook Security**:
   - CRC (Challenge-Response Check) validation ensures webhook authenticity
   - Events are logged in `TwitterWebhookEvent` table for debugging
   - OAuth 1.0a signatures verify bot subscription requests

### Webhook Scripts

Utility scripts are available in `/scripts/` for manual webhook management:

```bash
# View captured webhook events
npx tsx scripts/view-webhook-events.ts

# Manually register a webhook (usually not needed)
npx tsx scripts/register-webhook.ts

# Manually subscribe a bot to webhook (usually not needed)
npx tsx scripts/subscribe-webhook.ts
```

**Note**: These scripts are primarily for debugging. The system manages webhooks automatically.

## 📄 License

MIT

## 👥 Author

POAP Studio

## 🐛 Issues

Report issues at: https://github.com/poap-studio/xbot/issues
