/**
 * API Route: Generate Dynamic QR Code
 * Returns a QR code with tracking URL
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

/**
 * GET /api/qr/generate
 * Generate QR code with next available hidden code
 */
export async function GET(request: NextRequest) {
  try {
    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 500 }
      );
    }

    // Get next available (unused) hidden code
    const availableCode = await prisma.validCode.findFirst({
      where: { isUsed: false },
      orderBy: { createdAt: 'asc' },
    });

    if (!availableCode) {
      console.error('No available hidden codes found');
      return NextResponse.json(
        { error: 'No hidden codes available. Please upload more codes in the admin panel.' },
        { status: 503 }
      );
    }

    console.log(`Generating QR for code: ${availableCode.code}`);

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create tracking URL that will redirect to Twitter
    const trackingUrl = `${baseUrl}/api/qr/track?code=${encodeURIComponent(availableCode.code)}`;

    console.log(`Tracking URL: ${trackingUrl}`);

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    console.log(`✓ QR generated successfully for code: ${availableCode.code}`);

    return NextResponse.json({
      qrDataUrl,
      code: availableCode.code,
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
