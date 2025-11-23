/**
 * API Route: Track QR Code Scan
 * Marks code as used and redirects to Twitter with pre-filled tweet
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/track?code=XXX
 * Track QR scan and redirect to Twitter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Code parameter is required' },
        { status: 400 }
      );
    }

    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 500 }
      );
    }

    // Find the hidden code
    const validCode = await prisma.validCode.findUnique({
      where: { code },
    });

    if (!validCode) {
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 404 }
      );
    }

    // Mark code as used (only if not already used)
    if (!validCode.isUsed) {
      await prisma.validCode.update({
        where: { code },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      console.log(`Hidden code ${code} marked as used via QR scan`);

      // Notify SSE clients to update QR
      // This will be handled by a separate endpoint or in-memory event system
      notifyQrUpdate();
    }

    // Generate tweet text from template
    const tweetText = config.qrPageTweetTemplate.replace('{{code}}', code);

    // Create Twitter intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    // Redirect to Twitter
    return NextResponse.redirect(twitterUrl);
  } catch (error) {
    console.error('Error tracking QR scan:', error);
    return NextResponse.json(
      { error: 'Failed to track QR scan' },
      { status: 500 }
    );
  }
}

/**
 * Notify SSE clients that QR should update
 * In production, this would use Redis Pub/Sub or similar
 */
function notifyQrUpdate() {
  // For now, we'll use a simple global event
  // In production, use Redis Pub/Sub or similar
  if (global.qrUpdateListeners) {
    global.qrUpdateListeners.forEach((listener: Function) => {
      listener();
    });
  }
}

// Extend global type for TypeScript
declare global {
  var qrUpdateListeners: Function[] | undefined;
}
