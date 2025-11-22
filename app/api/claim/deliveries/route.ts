/**
 * API Route: Get user's POAP deliveries
 * Requires Twitter OAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserDeliveries } from '@/lib/bot/delivery';

export const dynamic = 'force-dynamic';

/**
 * GET /api/claim/deliveries
 * Returns all POAP deliveries for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in with Twitter.' },
        { status: 401 }
      );
    }

    const twitterId = session.user.id;

    // Get user's deliveries
    const deliveries = await getUserDeliveries(twitterId);

    // Transform deliveries for frontend
    const formattedDeliveries = deliveries.map((delivery) => ({
      id: delivery.id,
      tweetId: delivery.tweetId,
      mintLink: delivery.mintLink,
      qrHash: delivery.qrHash,
      deliveredAt: delivery.deliveredAt.toISOString(),
      claimed: delivery.claimed,
      claimedAt: delivery.claimedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      deliveries: formattedDeliveries,
      total: formattedDeliveries.length,
      claimed: formattedDeliveries.filter((d) => d.claimed).length,
      unclaimed: formattedDeliveries.filter((d) => !d.claimed).length,
    });
  } catch (error) {
    console.error('Error fetching deliveries:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch deliveries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
