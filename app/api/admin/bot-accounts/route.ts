/**
 * API endpoint to list all connected bot accounts
 * GET /api/admin/bot-accounts
 *
 * Features:
 * - Validates each bot account's Twitter credentials
 * - Automatically deletes accounts with invalid credentials
 * - Returns only valid, active bot accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Validate a specific bot account's credentials
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
async function validateBotAccount(botAccountId: string): Promise<boolean> {
  try {
    const botAccount = await prisma.botAccount.findUnique({
      where: { id: botAccountId },
    });

    if (!botAccount) {
      return false;
    }

    // Decrypt credentials
    const accessToken = decrypt(botAccount.accessToken);
    const accessSecret = decrypt(botAccount.accessSecret);

    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
      console.error('[Bot Validation] Missing Twitter API credentials');
      return false;
    }

    // Create authenticated client
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken,
      accessSecret,
    });

    // Try to verify credentials by getting the authenticated user
    // This will fail if credentials are invalid or revoked
    await client.v2.me();

    return true;
  } catch (error: any) {
    console.error(`[Bot Validation] Account ${botAccountId} validation failed:`, error.message || error);
    return false;
  }
}

/**
 * GET /api/admin/bot-accounts
 * List all connected bot accounts with automatic validation and cleanup
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Bot Accounts API] Fetching and validating bot accounts...');

    // Fetch all bot accounts
    const botAccounts = await prisma.botAccount.findMany({
      select: {
        id: true,
        twitterId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        isConnected: true,
        lastUsedAt: true,
        connectedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        connectedAt: 'desc',
      },
    });

    console.log(`[Bot Accounts API] Found ${botAccounts.length} bot account(s) in database`);

    // Validate each bot account and collect valid/invalid accounts
    const validationResults = await Promise.all(
      botAccounts.map(async (account) => {
        console.log(`[Bot Accounts API] Validating @${account.username} (${account.id})...`);
        const isValid = await validateBotAccount(account.id);
        return { account, isValid };
      })
    );

    // Separate valid and invalid accounts
    const validAccounts = validationResults
      .filter(result => result.isValid)
      .map(result => result.account);

    const invalidAccounts = validationResults
      .filter(result => !result.isValid)
      .map(result => result.account);

    // Auto-delete invalid accounts
    if (invalidAccounts.length > 0) {
      console.log(`[Bot Accounts API] ⚠️  Found ${invalidAccounts.length} invalid bot account(s)`);

      for (const account of invalidAccounts) {
        console.log(`[Bot Accounts API] 🗑️  Auto-deleting invalid account: @${account.username} (${account.twitterId})`);
        await prisma.botAccount.delete({
          where: { id: account.id },
        });
        console.log(`[Bot Accounts API] ✅ Deleted @${account.username}`);
      }
    }

    console.log(`[Bot Accounts API] Returning ${validAccounts.length} valid bot account(s)`);

    return NextResponse.json({
      botAccounts: validAccounts,
      total: validAccounts.length,
      deleted: invalidAccounts.length,
      deletedAccounts: invalidAccounts.map(acc => ({
        username: acc.username,
        twitterId: acc.twitterId,
      })),
    });
  } catch (error) {
    console.error('[Bot Accounts API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bot accounts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
