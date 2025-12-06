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
    // Get first active project for legacy compatibility
    const project = await prisma.project.findFirst({
      where: { isActive: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'No active project found' }, { status: 404 });
    }

    return NextResponse.json({
      tweetTemplate: project.qrPageTweetTemplate,
      hashtag: project.twitterHashtag,
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
    const { tweetTemplate, projectId } = body;

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

    // Find project to update (use projectId if provided, otherwise first active)
    const whereClause = projectId ? { id: projectId } : { isActive: true };
    const project = await prisma.project.findFirst({ where: whereClause });

    if (!project) {
      return NextResponse.json({ error: 'No project found' }, { status: 404 });
    }

    await prisma.project.update({
      where: { id: project.id },
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
