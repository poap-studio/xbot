# Claude Configuration for XBOT Project

## Project Information

- **Project Name:** XBOT (POAP Twitter Bot)
- **Description:** Automated POAP distribution bot for Twitter using Next.js and Vercel
- **Repository:** https://github.com/gotoalberto/xbot (assumed)
- **Production URL:** https://xbot.poap.studio
- **Production Domain:** xbot.poap.studio
- **Deployment Platform:** Vercel

---

## Deployment Configuration

### Vercel CLI Usage

**Important:** Always use Vercel CLI for environment variable configuration.

```bash
# Set environment variable using printf (avoids newlines)
printf "your-secret-value" | vercel env add VAR_NAME production

# Examples:
printf "sk-..." | vercel env add OPENAI_API_KEY production
printf "postgresql://..." | vercel env add DATABASE_URL production

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VAR_NAME production

# Pull environment variables to local
vercel env pull .env.local
```

**Critical:** Always use `printf` instead of `echo` to avoid trailing newline characters in secrets.

### Vercel Project Details

- **Project ID:** Check with `vercel project ls`
- **Organization:** alberto-g-toribios-projects
- **Project URL:** https://vercel.com/alberto-g-toribios-projects/xbot

---

## Development Workflow & Conventions

### Testing Requirements

**User Instruction:** "Realiza tests de todo"

- **Meaning:** Always run comprehensive tests before committing or deploying
- **Action:** Execute full test suite including unit, integration, and E2E tests
- **Command:** `npm test` or `npm run test:all`

**Testing Checklist:**
- [ ] Run unit tests: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Check test coverage: `npm run test:coverage`
- [ ] Verify all tests pass before proceeding
- [ ] Fix any failing tests before deployment

### Build Requirements

**User Instruction:** "Construye siempre antes de desplegar"

- **Meaning:** Always build the project before deploying to catch errors early
- **Action:** Run production build before any deployment
- **Command:** `npm run build`

**Build Checklist:**
- [ ] Run `npm run build` before deployment
- [ ] Verify build completes without errors
- [ ] Check build output for warnings
- [ ] Test built application locally if needed
- [ ] Resolve any build issues before deploying

### Deployment Workflow

**IMPORTANT:** This project has **auto-deployment** configured on Vercel.

**Workflow:**
1. Make changes locally
2. Run tests and build (`npm test` && `npm run build`)
3. Commit changes (`git commit`)
4. Push to main (`git push origin main`)
5. **Auto-deployment triggers on Vercel** - NO manual deployment needed
6. **ALWAYS check Vercel deployment logs** after push

**Checking Deployment Status:**

```bash
# Check latest deployment logs via Vercel CLI
vercel logs xbot.poap.studio --production

# Or check via Vercel dashboard
# https://vercel.com/alberto-g-toribios-projects/xbot
```

**Key Rule:**
- ❌ **NO** need to run `vercel deploy` manually
- ✅ Just `git push` → Auto-deployment happens
- ⚠️ **ALWAYS** review logs after push to confirm successful deployment

### Pre-Push Checklist

Before pushing to trigger deployment:

1. **Code Quality**
   - [ ] All tests passing (`npm test`)
   - [ ] Build succeeds (`npm run build`)
   - [ ] No TypeScript errors (`npm run type-check`)
   - [ ] Linting passes (`npm run lint`)

2. **Environment Variables**
   - [ ] All required variables set in Vercel
   - [ ] Verify with `vercel env ls`
   - [ ] No secrets in code or committed files

3. **Database**
   - [ ] Prisma migrations applied (`npx prisma migrate deploy`)
   - [ ] Database schema up-to-date
   - [ ] Connection strings valid

4. **Security**
   - [ ] Pre-commit hooks passing
   - [ ] No sensitive files committed
   - [ ] Dependencies updated and secure

5. **Post-Push**
   - [ ] **Monitor Vercel deployment logs**
   - [ ] Verify deployment succeeded
   - [ ] Check production site: https://xbot.poap.studio
   - [ ] Test critical functionality

---

## User Preferences & Instructions

This section auto-documents recurring user instructions and preferences.

### Documented Instructions

1. **Testing Protocol**
   - **Original Request:** "Realiza tests de todo"
   - **Interpretation:** Run comprehensive test suite before any deployment
   - **Implementation:** Always execute `npm test` and `npm run test:e2e`

2. **Build Protocol**
   - **Original Request:** "Construye siempre antes de desplegar"
   - **Interpretation:** Build project before deployment to catch errors
   - **Implementation:** Always execute `npm run build` before deployment

3. **Vercel Environment Variable Management**
   - **Original Request:** "Se debe usar el vercel CLI para configurar variables de entorno, siempre usando printf para evitar saltos de línea"
   - **Interpretation:** Use Vercel CLI with printf for setting environment variables
   - **Implementation:** `printf "value" | vercel env add VAR_NAME production`

4. **Auto-Deployment & Log Verification**
   - **Original Request:** "No es necesario desplegar y hacer commit porque al hacer commit se despliega, sin embargo, después de cada push se debe revisar siempre el log para comprobar que se ha desplegado correctamente"
   - **Interpretation:** Git push triggers auto-deployment on Vercel; always verify deployment logs after push
   - **Implementation:**
     - ❌ Don't run `vercel deploy` manually
     - ✅ Just `git push origin main`
     - ⚠️ Always run `vercel logs xbot.poap.studio --production` after push
     - Check Vercel dashboard: https://vercel.com/alberto-g-toribios-projects/xbot

### Adding New Instructions

When the user provides a new recurring instruction:

1. Document it in this section immediately
2. Include:
   - Original user request (exact wording)
   - Your interpretation
   - Implementation steps
   - Any relevant commands
3. Update the relevant workflow sections above if needed

**Template for new instructions:**
```markdown
### [Instruction Number]. [Brief Title]
- **Original Request:** "[Exact user quote]"
- **Interpretation:** [What this means]
- **Implementation:** [How to implement it]
- **Commands:** [Relevant commands if applicable]
```

---

## Project-Specific Best Practices

### Environment Variables

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `POAP_CLIENT_ID` - POAP API client ID
- `POAP_CLIENT_SECRET` - POAP API client secret
- `POAP_API_KEY` - POAP API key
- `TWITTER_BEARER_TOKEN` - Twitter API bearer token
- `TWITTER_CLIENT_ID` - Twitter OAuth client ID
- `TWITTER_CLIENT_SECRET` - Twitter OAuth client secret
- `NEXTAUTH_URL` - Application URL (https://xbot.poap.studio)
- `NEXTAUTH_SECRET` - NextAuth secret
- `ADMIN_PASSWORD` - Admin dashboard password
- `CRON_SECRET` - Cron job authentication secret
- `NEXT_PUBLIC_APP_URL` - Public app URL (https://xbot.poap.studio)

### Database Operations

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database (development only!)
npx prisma migrate reset
```

### Common Tasks

```bash
# Development
npm run dev              # Start development server

# Testing
npm test                 # Run tests
npm run test:watch      # Watch mode
npm run test:e2e        # E2E tests
npm run test:coverage   # Coverage report

# Building
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking

# Database
npm run prisma:studio   # Open Prisma Studio
npm run prisma:migrate  # Run migrations
```

---

## Security Considerations

### Secrets Management

- **NEVER** commit `.env*` files (except `.env.example`)
- **ALWAYS** use Vercel environment variables for production
- **USE** `printf` to set environment variables via CLI
- **ROTATE** secrets if accidentally exposed

### Pre-Commit Hooks

The project uses Husky for pre-commit hooks:
- Secret detection
- Linting (if configured)
- Type checking (if configured)

### GitHub Actions

Security scans run on:
- Every push to main
- Every pull request
- Weekly schedule

---

## Troubleshooting

### Common Issues

1. **Build Fails on Vercel**
   - Check environment variables are set
   - Verify Prisma schema is up-to-date
   - Check build logs for specific errors

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from Vercel
   - Ensure migrations are applied

3. **Cron Jobs Not Running**
   - Verify `CRON_SECRET` is set correctly
   - Check Vercel cron configuration in `vercel.json`
   - Review cron logs in admin dashboard

---

## Additional Notes

- This file should be updated whenever new recurring instructions are discovered
- Keep this file in sync with actual project practices
- Review and update quarterly or when major changes occur

---

**Last Updated:** 2025-12-06
**Maintained By:** Claude (auto-updated)
**Project Owner:** @gotoalberto
