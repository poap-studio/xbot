/**
 * API Route: Admin Deliveries
 * Returns all deliveries for monitoring
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/deliveries
 * Returns all deliveries with user information and project details
 */
export async function GET() {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        twitterUser: true,
        project: {
          select: {
            id: true,
            name: true,
            poapEventId: true,
          },
        },
      },
      orderBy: {
        deliveredAt: 'desc',
      },
    });

    const formattedDeliveries = deliveries.map((delivery) => ({
      id: delivery.id,
      twitterUserId: delivery.twitterUser.twitterId,
      username: delivery.twitterUser.username,
      tweetId: delivery.tweetId,
      mintLink: delivery.mintLink,
      qrHash: delivery.qrHash,
      deliveredAt: delivery.deliveredAt.toISOString(),
      claimed: delivery.claimed,
      claimedAt: delivery.claimedAt?.toISOString() || null,
      project: {
        id: delivery.project.id,
        name: delivery.project.name,
        poapEventId: delivery.project.poapEventId,
      },
    }));

    return NextResponse.json({
      success: true,
      deliveries: formattedDeliveries,
      total: formattedDeliveries.length,
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
