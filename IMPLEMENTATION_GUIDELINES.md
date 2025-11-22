# Implementation Guidelines - xbot Project

## Core Principles

### 1. Production-Ready Code Only
- ❌ NO minimal implementations
- ❌ NO "we'll add this later"
- ❌ NO placeholder code
- ✅ Full implementation from the start
- ✅ Production-ready quality
- ✅ Complete error handling
- ✅ Comprehensive tests

### 2. Testing Requirements
Every feature must include:
- **Unit tests** for all functions and utilities
- **Integration tests** for API routes
- **Component tests** for React components
- **E2E tests** for critical user flows
- **Minimum 80% code coverage**

### 3. Security Standards
- All secrets and tokens must be encrypted at rest
- Use environment variables for configuration
- Never commit sensitive data
- Implement proper authentication checks
- Use HTTPS in production
- Validate all inputs
- Sanitize all outputs

### 4. Error Handling
- Catch and handle all possible errors
- Provide meaningful error messages
- Log errors appropriately
- Return proper HTTP status codes
- Implement retry logic where appropriate
- Graceful degradation

### 5. Code Quality
- TypeScript strict mode enabled
- ESLint rules enforced
- No `any` types without justification
- Proper type definitions
- Clear variable and function names
- Comments for complex logic
- DRY principle (Don't Repeat Yourself)

### 6. Documentation
- README.md updated for each major feature
- API routes documented
- Complex functions commented
- Environment variables documented in .env.example
- PROGRESS.md updated after each phase
- Deployment instructions included

### 7. Git Workflow
- Meaningful commit messages
- One logical change per commit
- Build must pass before commit
- Tests must pass before commit
- Push after completing each phase
- Use conventional commits format

### 8. Database
- Migrations versioned and tracked
- No manual schema changes
- Indexes for all foreign keys
- Proper constraints and validations
- Backup strategy documented

### 9. Performance
- Optimize database queries
- Use proper indexes
- Implement caching where appropriate
- Lazy load components
- Minimize bundle size
- Use pagination for large datasets

### 10. Deployment
- Must work in Vercel environment
- Environment-specific configurations
- Health check endpoints
- Monitoring and logging
- Rollback plan documented

## Phase Implementation Checklist

For each phase, ensure:

- [ ] All code is production-ready
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests for user flows (where applicable)
- [ ] Code coverage ≥ 80%
- [ ] TypeScript compilation with no errors
- [ ] ESLint with no warnings
- [ ] Build successful (`npm run build`)
- [ ] All tests passing (`npm run test:all`)
- [ ] Environment variables documented
- [ ] PROGRESS.md updated
- [ ] Git commit with descriptive message
- [ ] Pushed to GitHub

## Specific Guidelines by Technology

### Next.js
- Use App Router (not Pages Router)
- Server Components by default
- Client Components only when needed
- Proper loading states
- Error boundaries
- Metadata for SEO

### Prisma
- Always use transactions for related operations
- Proper error handling for unique constraints
- Use select to limit returned fields
- Include relations only when needed
- Use indexes for performance

### React Components
- Functional components only
- Proper prop types
- Error boundaries
- Loading states
- Empty states
- Accessibility (a11y) considerations

### API Routes
- Proper HTTP methods (GET, POST, DELETE, etc.)
- Authentication checks
- Input validation with Zod
- Proper error responses
- Rate limiting where needed
- CORS configuration

### Testing
- Mock external APIs
- Use test database
- Clean up after tests
- Test error cases
- Test edge cases
- Test happy path

## Anti-Patterns to Avoid

❌ `// TODO: implement this later`
❌ `any` types everywhere
❌ No error handling
❌ Hardcoded values
❌ No tests
❌ Copy-paste code
❌ Unclear variable names
❌ Commented-out code
❌ Console.log in production
❌ Unhandled promises

## Code Review Checklist

Before committing, verify:

- [ ] Code is self-documenting or has comments
- [ ] No console.log or debugger statements
- [ ] No commented-out code
- [ ] Proper error handling
- [ ] Types are specific (not `any`)
- [ ] Tests are comprehensive
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] Follows project structure
- [ ] Consistent code style

## Definition of Done

A phase is considered "done" when:

1. ✅ All planned features are fully implemented
2. ✅ All tests are written and passing
3. ✅ Code coverage meets or exceeds 80%
4. ✅ Build is successful without errors or warnings
5. ✅ Documentation is complete and up-to-date
6. ✅ Code has been reviewed against guidelines
7. ✅ Changes are committed and pushed to GitHub
8. ✅ PROGRESS.md reflects completion
9. ✅ Ready for production deployment
10. ✅ No known bugs or issues

## Emergency Exceptions

The ONLY acceptable reason to deviate from these guidelines:

- **None** - Follow the guidelines completely

If you think you need an exception, you probably don't. Plan better.

---

**Remember: We build it right the first time, not twice.**
