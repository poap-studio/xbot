/**
 * API endpoint to list all connected bot accounts
 * GET /api/admin/bot-accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bot-accounts
 * List all connected bot accounts
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      botAccounts,
      total: botAccounts.length,
    });
  } catch (error) {
    console.error('Error fetching bot accounts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bot accounts';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
