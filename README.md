# POAP Twitter Bot

Automated bot that delivers POAP mint links to Twitter users who post eligible tweets.

## 🚀 Features

- **Automated Tweet Monitoring**: Monitors hashtags for eligible tweets with images and special codes
- **POAP Delivery**: Reserves and delivers unique mint links to eligible users
- **Web Claim Interface**: Twitter OAuth login to view and claim POAPs
- **Admin Dashboard**: Configure bot settings, view statistics, and export delivery data

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
2. Configure:
   - POAP Event ID and Secret Code
   - Bot reply text template
   - Twitter hashtag to monitor
   - Required code text in tweets

### User Flow

1. User posts a tweet with:
   - Configured hashtag (e.g., #POAP)
   - Required code text (e.g., "ELIGIBLE")
   - Image attachment
2. Bot detects eligible tweet and reserves a mint link
3. Bot replies to tweet with claim URL
4. User visits claim URL and logs in with Twitter
5. User sees their mint link and claims POAP

## 📁 Project Structure

```
xbot/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   │   ├── admin/        # Admin endpoints
│   │   ├── auth/         # NextAuth
│   │   ├── cron/         # Cron jobs
│   │   └── deliveries/   # User deliveries
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

## 📝 API Routes

- `GET /api/deliveries` - Get user's deliveries
- `GET /api/admin/config` - Get bot configuration
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/stats` - Get statistics
- `GET /api/admin/deliveries` - Get all deliveries
- `GET /api/admin/deliveries/csv` - Download CSV
- `GET /api/cron/process-tweets` - Cron job endpoint

## 📄 License

MIT

## 👥 Author

POAP Studio

## 🐛 Issues

Report issues at: https://github.com/poap-studio/xbot/issues
