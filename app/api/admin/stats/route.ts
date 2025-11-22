/**
 * API Route: Admin Dashboard Statistics
 * Provides comprehensive stats for the admin dashboard
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDeliveryStats } from '@/lib/bot/delivery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * Returns comprehensive statistics for the admin dashboard
 */
export async function GET() {
  try {
    // Get bot status
    const botAccount = await prisma.botAccount.findFirst({
      orderBy: { lastUsedAt: 'desc' },
    });

    // Get delivery stats
    const deliveryStats = await getDeliveryStats();

    // Get mint link stats
    const [totalLinks, availableLinks, reservedLinks, claimedLinks] = await Promise.all([
      prisma.qRCode.count(),
      prisma.qRCode.count({ where: { claimed: false, reservedFor: null } }),
      prisma.qRCode.count({ where: { claimed: false, reservedFor: { not: null } } }),
      prisma.qRCode.count({ where: { claimed: true } }),
    ]);

    // Get tweet stats
    const [totalTweets, eligibleTweets, repliedTweets, pendingTweets] = await Promise.all([
      prisma.tweet.count(),
      prisma.tweet.count({ where: { isEligible: true } }),
      prisma.tweet.count({ where: { botReplied: true } }),
      prisma.tweet.count({ where: { isEligible: true, botReplied: false } }),
    ]);

    return NextResponse.json({
      bot: {
        connected: !!botAccount,
        username: botAccount?.username || undefined,
        lastUsed: botAccount?.lastUsedAt?.toISOString() || undefined,
      },
      deliveries: {
        total: deliveryStats.totalDelivered,
        claimed: deliveryStats.totalClaimed,
        unclaimed: deliveryStats.totalUnclaimed,
        claimRate: deliveryStats.claimRate,
      },
      mintLinks: {
        total: totalLinks,
        available: availableLinks,
        reserved: reservedLinks,
        claimed: claimedLinks,
      },
      tweets: {
        total: totalTweets,
        eligible: eligibleTweets,
        replied: repliedTweets,
        pending: pendingTweets,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
