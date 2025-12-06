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
    // Get first active project for legacy compatibility
    const project = await prisma.project.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!project) {
      return NextResponse.json({
        eventId: '',
        eventName: '',
        searchQuery: '',
        replyTemplate: '',
      });
    }

    return NextResponse.json({
      eventId: project.poapEventId || '',
      editCode: project.poapEditCode || '',
      allowMultipleClaims: project.allowMultipleClaims ?? false,
      eventName: project.name || '',
      searchQuery: project.twitterHashtag || '',
      replyTemplate: project.botReplyEligible || '',
      replyEligible: project.botReplyEligible || '',
      replyNotEligible: project.botReplyNotEligible || '',
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

    const { projectId, eventId, editCode, allowMultipleClaims, searchQuery, replyTemplate, replyEligible, replyNotEligible } = body;

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

    // Find project to update (use projectId if provided, otherwise first active)
    const whereClause = projectId ? { id: projectId } : { isActive: true };
    const existingProject = await prisma.project.findFirst({ where: whereClause });

    let project;
    if (existingProject) {
      // Update existing project
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

      if (typeof allowMultipleClaims === 'boolean') {
        updateData.allowMultipleClaims = allowMultipleClaims;
      }

      project = await prisma.project.update({
        where: { id: existingProject.id },
        data: updateData,
      });
    } else {
      // No project found
      return NextResponse.json(
        { error: 'No project found. Please create a project first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: {
        eventId: project.poapEventId,
        editCode: project.poapEditCode,
        allowMultipleClaims: project.allowMultipleClaims,
        searchQuery: project.twitterHashtag,
        replyTemplate: project.botReplyEligible,
        replyEligible: project.botReplyEligible,
        replyNotEligible: project.botReplyNotEligible,
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
