/**
 * API Route: QR Page Configuration
 * GET/POST configuration for dynamic QR codes
 * Note: Protected by middleware - only accessible to authenticated admins
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/qr-page/config
 * Get QR page configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({
      tweetTemplate: config.qrPageTweetTemplate,
      hashtag: config.twitterHashtag,
      logoUrl: config.qrPageLogoUrl,
      backgroundUrl: config.qrPageBackgroundUrl,
      customText: config.qrPageCustomText,
      poapEventId: config.qrPagePoapEventId,
    });
  } catch (error) {
    console.error('Error fetching QR page config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/qr-page/config
 * Update QR page configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tweetTemplate,
      logoUrl,
      backgroundUrl,
      customText,
      poapEventId
    } = body;

    // Validate tweet template if provided
    if (tweetTemplate !== undefined) {
      if (typeof tweetTemplate !== 'string' || !tweetTemplate) {
        return NextResponse.json(
          { error: 'Tweet template must be a non-empty string' },
          { status: 400 }
        );
      }

      // Ensure template contains {{code}} placeholder
      if (!tweetTemplate.includes('{{code}}')) {
        return NextResponse.json(
          { error: 'Tweet template must contain {{code}} placeholder' },
          { status: 400 }
        );
      }
    }

    // Update configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (tweetTemplate !== undefined) updateData.qrPageTweetTemplate = tweetTemplate;
    if (logoUrl !== undefined) updateData.qrPageLogoUrl = logoUrl;
    if (backgroundUrl !== undefined) updateData.qrPageBackgroundUrl = backgroundUrl;
    if (customText !== undefined) updateData.qrPageCustomText = customText;
    if (poapEventId !== undefined) updateData.qrPagePoapEventId = poapEventId;

    await prisma.config.update({
      where: { id: config.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating QR page config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
