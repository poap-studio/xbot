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

      // Notify SSE clients to update QR - IMPORTANT: Do this AFTER marking as used
      notifyQrUpdate();
      console.log('SSE update notification sent to all connected clients');
    }

    // Generate tweet text from template
    const tweetText = config.qrPageTweetTemplate.replace('{{code}}', code);

    // Create Twitter app deep link with fallback to web
    // For mobile: twitter://post?message=...
    // For web fallback: we'll use a redirect page
    const twitterAppUrl = `twitter://post?message=${encodeURIComponent(tweetText)}`;
    const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    // Create HTML page that tries to open the app first, then falls back to web
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Opening Twitter...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f8fa;
      color: #14171a;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      border: 3px solid #e1e8ed;
      border-top: 3px solid #1da1f2;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .button {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #1da1f2;
      color: white;
      text-decoration: none;
      border-radius: 9999px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Opening Twitter...</h2>
    <p>If Twitter doesn't open automatically:</p>
    <a href="${twitterWebUrl}" class="button">Click here to tweet</a>
  </div>
  <script>
    // Try to open the app first
    window.location.href = "${twitterAppUrl}";

    // If app doesn't open within 2 seconds, redirect to web
    setTimeout(function() {
      window.location.href = "${twitterWebUrl}";
    }, 2000);
  </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
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
