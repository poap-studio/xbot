# POAP Twitter Bot

Automated bot that delivers POAP mint links to Twitter users who post eligible tweets.

**Production:** [https://twitterbot.poap.studio](https://twitterbot.poap.studio)
**Repository:** [https://github.com/poap-studio/xbot](https://github.com/poap-studio/xbot)
**Deployment:** Vercel ([Dashboard](https://vercel.com/alberto-g-toribios-projects/xbot))

## 🚀 Features

- **Automated Tweet Monitoring**: Monitors hashtags for eligible tweets with images and special codes
- **POAP Delivery**: Reserves and delivers unique mint links to eligible users
- **Dynamic QR Code Generation**: Generate QR codes with secret codes that redirect to Twitter with pre-filled tweets
- **Web Claim Interface**: Twitter OAuth login to view and claim POAPs
- **Admin Dashboard**: Configure bot settings, view statistics, and export delivery data with organized tabs
- **Multi-Bot Support**: Connect and manage multiple Twitter bot accounts with OAuth 1.0a authentication
- **Per-Project Bot Configuration**: Assign specific bot accounts to different projects for organized reply management

## 🏗️ Architecture

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: NextAuth.js with Twitter OAuth 2.0
- **APIs**: Twitter API v2 + POAP API
- **Hosting**: Vercel with automated cron jobs

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

# Vercel Cron Protection
CRON_SECRET="generate_with_openssl_rand_base64_32"
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

The cron job is automatically configured via `vercel.json`.

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

#### Flow 1: Tweet-based POAP Claim
1. User posts a tweet with:
   - Configured hashtag (e.g., #POAP)
   - Required code text (e.g., "ELIGIBLE")
   - Image attachment
2. Bot detects eligible tweet and reserves a mint link
3. Bot replies to tweet with claim URL
4. User visits claim URL and logs in with Twitter
5. User sees their mint link and claims POAP

#### Flow 2: QR Code POAP Claim
1. Admin generates QR code with secret code in admin dashboard
2. User scans QR code (typically at event booth)
3. QR redirects to Twitter app with pre-filled tweet containing secret code
4. User posts the tweet with hashtag
5. Bot detects tweet and delivers POAP mint link via reply
6. User claims POAP from mint link

## 📁 Project Structure

```
xbot/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # NextAuth
│   │   ├── cron/         # Cron jobs
│   │   ├── deliveries/   # User deliveries
│   │   └── qr/           # QR code generation & tracking
│   ├── claim/            # Claim page
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/            # React components
│   └── admin/            # Admin components
├── lib/                   # Core logic
│   ├── bot/              # Bot processor
│   ├── poap/             # POAP API client
│   ├── twitter/          # Twitter API client
│   └── prisma.ts         # Prisma client
├── prisma/
│   └── schema.prisma     # Database schema
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
- `GET /api/cron/process-tweets` - Cron job endpoint (requires CRON_SECRET)

## 📄 License

MIT

## 👥 Author

POAP Studio

## 🐛 Issues

Report issues at: https://github.com/poap-studio/xbot/issues
