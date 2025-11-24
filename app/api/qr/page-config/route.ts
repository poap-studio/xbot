/**
 * API Route: Public QR Page Configuration
 * GET configuration for displaying QR page with customizations
 * Note: Public endpoint - no authentication required
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPoapEventById } from '@/lib/poap/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/page-config
 * Get QR page display configuration including POAP artwork
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Base response
    const response: any = {
      logoUrl: config.qrPageLogoUrl,
      backgroundUrl: config.qrPageBackgroundUrl,
      customText: config.qrPageCustomText,
      poapEventId: config.qrPagePoapEventId,
      poapArtworkUrl: null,
      poapEventName: null,
    };

    // If POAP event ID is configured, fetch the event artwork
    if (config.qrPagePoapEventId) {
      try {
        const eventData = await getPoapEventById(config.qrPagePoapEventId);
        response.poapArtworkUrl = eventData.image_url;
        response.poapEventName = eventData.name;
      } catch (error) {
        console.error('Error fetching POAP event artwork:', error);
        // Don't fail the entire request if POAP fetch fails
        // Just return null for artwork URL
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching QR page config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
