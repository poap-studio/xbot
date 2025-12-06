/**
 * API Route: Project Management
 * GET - List all projects
 * POST - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/projects
 * List all projects with stats
 */
export async function GET(request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        botAccount: {
          select: {
            username: true,
            isConnected: true,
          },
        },
        _count: {
          select: {
            validCodes: true,
            qrCodes: true,
            deliveries: true,
            tweets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get additional stats for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const [claimedDeliveries, eligibleTweets] = await Promise.all([
          prisma.delivery.count({
            where: {
              projectId: project.id,
              claimed: true,
            },
          }),
          prisma.tweet.count({
            where: {
              projectId: project.id,
              isEligible: true,
            },
          }),
        ]);

        return {
          id: project.id,
          name: project.name,
          poapEventId: project.poapEventId,
          twitterHashtag: project.twitterHashtag,
          isActive: project.isActive,
          botAccount: project.botAccount,
          stats: {
            validCodes: project._count.validCodes,
            qrCodes: project._count.qrCodes,
            deliveries: project._count.deliveries,
            claimedDeliveries,
            tweets: project._count.tweets,
            eligibleTweets,
          },
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      projects: projectsWithStats,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/projects
 * Create new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      poapEventId,
      poapEditCode,
      allowMultipleClaims = false,
      botReplyEligible,
      botReplyNotEligible,
      botReplyAlreadyClaimed,
      twitterHashtag,
      qrPageTweetTemplate,
      isActive = true,
      botAccountId,
    } = body;

    // Validate required fields
    if (!name || !poapEventId || !poapEditCode) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'name, poapEventId, and poapEditCode are required',
        },
        { status: 400 }
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        poapEventId,
        poapEditCode,
        allowMultipleClaims,
        botReplyEligible: botReplyEligible || '¡Felicidades! Has compartido el código correcto. Reclama tu POAP aquí: {{claimUrl}}',
        botReplyNotEligible: botReplyNotEligible || 'Gracias por tu interés. Asegúrate de incluir un código válido y una imagen en tu tweet.',
        botReplyAlreadyClaimed: botReplyAlreadyClaimed || 'You have already claimed a POAP for this event. Only one claim per user is allowed.',
        twitterHashtag: twitterHashtag || '#POAP',
        qrPageTweetTemplate: qrPageTweetTemplate || 'I visited the POAP Studio booth at ETH Global, and here\'s the proof! The secret word is {{code}} {{hashtag}}',
        isActive,
        botAccountId: botAccountId || null,
      },
      include: {
        botAccount: {
          select: {
            username: true,
            isConnected: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        poapEventId: project.poapEventId,
        twitterHashtag: project.twitterHashtag,
        isActive: project.isActive,
        botAccount: project.botAccount,
        createdAt: project.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      {
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
