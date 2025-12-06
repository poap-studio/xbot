/**
 * API Route: Get user's POAP deliveries
 * Requires Twitter OAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserDeliveries } from '@/lib/bot/delivery';
import { getQRCodeInfo } from '@/lib/poap/api';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/claim/deliveries
 * Returns all POAP deliveries for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    console.log('=== CLAIM DELIVERIES SESSION DEBUG ===');
    console.log('Session:', JSON.stringify(session, null, 2));
    console.log('======================================');

    if (!session?.user?.id) {
      console.error('No user ID in session. Session:', session);
      return NextResponse.json(
        { error: 'Unauthorized. Please log in with Twitter.' },
        { status: 401 }
      );
    }

    const twitterId = session.user.id;

    // Get user's deliveries
    const deliveries = await getUserDeliveries(twitterId);

    // Get POAP event name from config
    const config = await prisma.config.findFirst();
    let poapEventName = 'POAP Achievement';

    if (config?.poapEventId) {
      try {
        // Fetch event details from POAP API
        const response = await fetch(`https://api.poap.tech/events/id/${config.poapEventId}`, {
          headers: {
            'X-API-Key': process.env.POAP_API_KEY || '',
          },
        });

        if (response.ok) {
          const eventData = await response.json();
          poapEventName = eventData.name || 'POAP Achievement';
        }
      } catch (error) {
        console.error('Error fetching POAP event name:', error);
        // Continue with default name
      }
    }

    // Check claim status from POAP API for each delivery
    const deliveriesWithRealStatus = await Promise.all(
      deliveries.map(async (delivery) => {
        let realClaimStatus = delivery.claimed;
        let realClaimedAt = delivery.claimedAt;

        try {
          // Check real claim status from POAP API
          const qrInfo = await getQRCodeInfo(delivery.qrHash);
          realClaimStatus = qrInfo.claimed;

          // If it's claimed in POAP but not in our DB, update our DB
          if (qrInfo.claimed && !delivery.claimed) {
            console.log(`Updating claim status for ${delivery.qrHash} - claimed in POAP but not in DB`);

            await prisma.delivery.update({
              where: { id: delivery.id },
              data: {
                claimed: true,
                claimedAt: new Date(),
              },
            });

            // Also update the QRCode table
            await prisma.qRCode.updateMany({
              where: { qrHash: delivery.qrHash },
              data: {
                claimed: true,
                claimedAt: new Date(),
                claimedBy: qrInfo.beneficiary || 'unknown',
              },
            });

            realClaimedAt = new Date();
          }
        } catch (error) {
          console.error(`Error checking claim status for ${delivery.qrHash}:`, error);
          // If API call fails, use database value
        }

        return {
          ...delivery,
          claimed: realClaimStatus,
          claimedAt: realClaimedAt,
        };
      })
    );

    // Transform deliveries for frontend
    const formattedDeliveries = deliveriesWithRealStatus.map((delivery) => ({
      id: delivery.id,
      tweetId: delivery.tweetId,
      mintLink: delivery.mintLink,
      qrHash: delivery.qrHash,
      deliveredAt: delivery.deliveredAt.toISOString(),
      claimed: delivery.claimed,
      claimedAt: delivery.claimedAt?.toISOString() || null,
      poapName: poapEventName,
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
