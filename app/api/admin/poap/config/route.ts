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
      editCode: config.poapEditCode || '',
      eventName: '', // Not stored in database
      searchQuery: config.twitterHashtag || '',
      replyTemplate: config.botReplyEligible || '',
      replyEligible: config.botReplyEligible || '',
      replyNotEligible: config.botReplyNotEligible || '',
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

    const { eventId, editCode, searchQuery, replyTemplate, replyEligible, replyNotEligible } = body;

    // Validate required fields
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Use replyTemplate for backward compatibility, or use new fields
    const eligibleMsg = replyEligible || replyTemplate;
    const notEligibleMsg = replyNotEligible;

    // Validate eligible message contains {{claimUrl}} placeholder
    if (eligibleMsg && !eligibleMsg.includes('{{claimUrl}}') && !eligibleMsg.includes('{mintLink}')) {
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
      const updateData: any = {
        poapEventId: eventId,
      };

      if (editCode) {
        updateData.poapEditCode = editCode;
      }

      if (searchQuery) {
        updateData.twitterHashtag = searchQuery;
      }

      if (eligibleMsg) {
        updateData.botReplyEligible = eligibleMsg;
      }

      if (notEligibleMsg) {
        updateData.botReplyNotEligible = notEligibleMsg;
      }

      config = await prisma.config.update({
        where: { id: existingConfig.id },
        data: updateData,
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
        editCode: config.poapEditCode,
        searchQuery: config.twitterHashtag,
        replyTemplate: config.botReplyEligible,
        replyEligible: config.botReplyEligible,
        replyNotEligible: config.botReplyNotEligible,
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
