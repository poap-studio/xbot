/**
 * API Route: POAP Configuration
 * Manage POAP event settings and reply templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/poap/config
 * Returns current POAP configuration
 */
export async function GET() {
  try {
    const config = await prisma.config.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return NextResponse.json({
        eventId: '',
        eventName: '',
        searchQuery: '',
        replyTemplate: '',
      });
    }

    return NextResponse.json({
      eventId: config.poapEventId || '',
      eventName: '', // Not stored in database
      searchQuery: config.twitterHashtag || '',
      replyTemplate: config.botReplyText || '',
    });
  } catch (error) {
    console.error('Error fetching POAP config:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/poap/config
 * Updates POAP configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { eventId, searchQuery, replyTemplate } = body;

    // Validate required fields
    if (!eventId || !searchQuery || !replyTemplate) {
      return NextResponse.json(
        { error: 'Event ID, search query, and reply template are required' },
        { status: 400 }
      );
    }

    // Validate reply template contains {{claimUrl}} placeholder
    if (!replyTemplate.includes('{{claimUrl}}') && !replyTemplate.includes('{mintLink}')) {
      return NextResponse.json(
        { error: 'Reply template must contain {{claimUrl}} or {mintLink} placeholder' },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.config.findFirst();

    let config;
    if (existingConfig) {
      // Update existing config
      config = await prisma.config.update({
        where: { id: existingConfig.id },
        data: {
          poapEventId: eventId,
          twitterHashtag: searchQuery,
          botReplyText: replyTemplate,
        },
      });
    } else {
      // Create new config - requires poapSecretCode
      return NextResponse.json(
        { error: 'No configuration found. Please initialize the database first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        eventId: config.poapEventId,
        searchQuery: config.twitterHashtag,
        replyTemplate: config.botReplyText,
      },
    });
  } catch (error) {
    console.error('Error saving POAP config:', error);

    return NextResponse.json(
      {
        error: 'Failed to save configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
