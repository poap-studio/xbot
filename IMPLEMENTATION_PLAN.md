# XBOT Multi-Project Implementation Plan

## Current Status: Implementing Project Detail Pages

### Completed ✅

1. **Multi-Project Architecture** (Commit: fe2ea66)
   - Migrated database schema from single to multi-project
   - Updated all models with projectId foreign keys
   - Implemented composite unique keys (tweetId_projectId, code_projectId, qrHash_projectId)
   - Created Project model with all project-specific configurations
   - Updated bot logic to determine project from hidden code
   - API routes updated to require projectId

2. **Admin Interface Reorganization** (Commits: 2c6695b, c0a25e6)
   - Simplified navigation: Projects, Drops, Cron Logs
   - Removed project-specific sections from main navigation
   - Translated all pages to English
   - Enhanced Drops page with:
     - Project filter with autocomplete
     - POAP/Project name column
     - Twitter profile links
     - Complete delivery details (QR hash, tweet, status, date)
     - Dynamic stats based on selected project

### In Progress 🔄

**Project Detail Pages** (`/admin/projects/[id]`)

Location: `/app/admin/projects/[id]/page.tsx`

Structure:
```
/admin/projects/[id]
├── General Tab
│   ├── Project Info (name, event ID, edit code)
│   ├── Bot Account selection
│   ├── Status (Active/Inactive toggle)
│   └── Hashtag configuration
├── POAP Config Tab
│   ├── Reply templates (eligible, not eligible, already claimed)
│   ├── Multiple claims toggle
│   └── QR Page tweet template
├── Valid Codes Tab
│   ├── Upload CSV codes
│   ├── List of codes with status
│   ├── Delete all option
│   └── Stats (total, used, unused)
└── QR Codes Tab
    ├── Load from POAP API (event ID + edit code)
    ├── List of QR codes
    ├── Stats (total, claimed, available)
    └── Export functionality
```

### Next Steps 📋

1. **Create Project Detail Page Structure**
   - File: `/app/admin/projects/[id]/page.tsx`
   - Implement tabs layout (Material-UI Tabs)
   - Fetch project data using projectId param
   - Create separate components for each tab

2. **General Tab Component**
   - Form fields: name, poapEventId, poapEditCode, twitterHashtag
   - Bot account selector (dropdown with connected accounts)
   - isActive toggle
   - Save button to update project

3. **POAP Config Tab Component**
   - Text fields for: botReplyEligible, botReplyNotEligible, botReplyAlreadyClaimed
   - Text field for: qrPageTweetTemplate
   - allowMultipleClaims checkbox
   - Preview of templates with placeholder examples
   - Save button

4. **Valid Codes Tab Component**
   - Reuse existing `/admin/hidden-codes` functionality
   - Filter by projectId
   - Upload CSV endpoint already accepts projectId
   - Stats endpoint needs projectId filter

5. **QR Codes Tab Component**
   - Reuse existing `/admin/mint-links` and `/admin/qr-codes/load` functionality
   - Filter by projectId
   - Load from POAP API button
   - Stats display

6. **New Project Page**
   - File: `/app/admin/projects/new/page.tsx`
   - Form to create new project
   - Required fields: name, poapEventId, poapEditCode
   - Default values for templates and settings
   - Redirect to project detail after creation

### API Endpoints (Already Implemented)

- ✅ GET `/api/admin/projects` - List all projects
- ✅ POST `/api/admin/projects` - Create new project
- ✅ GET `/api/admin/projects/[id]` - Get project details
- ✅ PATCH `/api/admin/projects/[id]` - Update project
- ✅ DELETE `/api/admin/projects/[id]` - Delete project
- ✅ POST `/api/admin/valid-codes/upload` - Upload codes (accepts projectId)
- ✅ POST `/api/admin/qr-codes/load` - Load QR codes (accepts projectId)
- ✅ GET `/api/admin/deliveries` - List deliveries (includes project info)

### Files to Reference

**Existing pages to adapt:**
- `/app/admin/hidden-codes/page.tsx` - Valid codes management
- `/app/admin/mint-links/page.tsx` - QR codes list
- `/app/admin/qr-page/page.tsx` - QR page config
- `/app/admin/poap/page.tsx` - POAP config
- `/app/admin/bot/page.tsx` - Bot config

**API routes to adapt:**
- `/app/api/admin/hidden-codes/*` - Add projectId filter
- `/app/api/admin/mint-links/*` - Add projectId filter
- `/app/api/admin/qr-codes/*` - Already has projectId

### Database Schema Reference

```prisma
model Project {
  id              String   @id @default(cuid())
  name            String
  poapEventId     String
  poapEditCode    String
  allowMultipleClaims Boolean @default(false)
  botReplyEligible    String @default("...")
  botReplyNotEligible String @default("...")
  botReplyAlreadyClaimed String @default("...")
  twitterHashtag  String @default("#POAP")
  qrPageTweetTemplate String @default("...")
  isActive        Boolean @default(true)
  botAccountId    String?
  botAccount      BotAccount? @relation(...)
  validCodes      ValidCode[]
  qrCodes         QRCode[]
  deliveries      Delivery[]
  tweets          Tweet[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Recovery Instructions

If context is lost, continue from here:

1. Read this file: `/Users/albertogomeztoribio/git/xbot/IMPLEMENTATION_PLAN.md`
2. Check current git status: `git status`
3. Review last commit: `git log -1`
4. Continue with "Next Steps" section above
5. Current working directory: `/Users/albertogomeztoribio/git/xbot`
6. Main branch: `main`
7. Deploy with: `git push origin main` (Vercel auto-deploys)

### Key Design Decisions

- **Single-page with tabs** instead of separate routes for better UX
- **Reuse existing components** from old admin pages when possible
- **Project-scoped configs** instead of global settings
- **Bot searches all active projects** using their hashtags
- **Hidden code determines project** for each tweet
- **All text in English** for consistency

### Recent Updates

**2025-12-07 - Project Detail Pages Created**
- ✅ Created `/app/admin/projects/[id]/page.tsx` with tabs layout
- ✅ Created `/app/admin/projects/new/page.tsx` with project creation form
- ✅ Implemented breadcrumbs and navigation
- ✅ Built tab structure for: General, POAP Config, Valid Codes, QR Codes
- 🔄 Next: Implement each tab's functionality

Last Updated: 2025-12-07
Status: Project detail page structure complete, implementing tab content
