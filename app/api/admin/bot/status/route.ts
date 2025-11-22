/**
 * API Route: Bot Status
 * Returns current bot status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBotStatus } from '@/lib/bot/status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bot/status
 * Returns current bot status
 */
export async function GET() {
  try {
    const botStatus = await getBotStatus();

    // Get bot account info
    const botAccount = await prisma.botAccount.findFirst({
      orderBy: { lastUsedAt: 'desc' },
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedToday = await prisma.tweet.count({
      where: {
        botReplied: true,
        processedAt: { gte: today },
      },
    });

    return NextResponse.json({
      running: botStatus.isRunning,
      connected: !!botAccount,
      username: botAccount?.username || undefined,
      lastRun: botStatus.lastRun?.toISOString() || undefined,
      processedToday,
      errors: 0, // TODO: Implement error tracking
    });
  } catch (error) {
    console.error('Error fetching bot status:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch bot status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
