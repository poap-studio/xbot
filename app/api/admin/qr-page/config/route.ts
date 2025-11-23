/**
 * API Route: QR Page Configuration
 * GET/POST configuration for dynamic QR codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/qr-page/config
 * Get QR page configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({
      tweetTemplate: config.qrPageTweetTemplate,
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
    // Check admin authentication
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tweetTemplate } = body;

    // Validate tweet template
    if (!tweetTemplate || typeof tweetTemplate !== 'string') {
      return NextResponse.json(
        { error: 'Tweet template is required' },
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

    // Update configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await prisma.config.update({
      where: { id: config.id },
      data: {
        qrPageTweetTemplate: tweetTemplate,
      },
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
