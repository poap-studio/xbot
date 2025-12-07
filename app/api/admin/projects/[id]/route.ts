/**
 * API Route: Single Project Management
 * GET - Get project details
 * PUT - Update project
 * DELETE - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/projects/[id]
 * Get single project with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        botAccount: true,
        _count: {
          select: {
            validCodes: true,
            qrCodes: true,
            deliveries: true,
            tweets: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/projects/[id]
 * Update project (partial update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

/**
 * PUT /api/admin/projects/[id]
 * Update project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      poapEventId,
      poapEditCode,
      allowMultipleClaims,
      botReplyEligible,
      botReplyNotEligible,
      botReplyAlreadyClaimed,
      twitterHashtag,
      qrPageTweetTemplate,
      isActive,
      botAccountId,
    } = body;

    // Update project
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(poapEventId !== undefined && { poapEventId }),
        ...(poapEditCode !== undefined && { poapEditCode }),
        ...(allowMultipleClaims !== undefined && { allowMultipleClaims }),
        ...(botReplyEligible !== undefined && { botReplyEligible }),
        ...(botReplyNotEligible !== undefined && { botReplyNotEligible }),
        ...(botReplyAlreadyClaimed !== undefined && { botReplyAlreadyClaimed }),
        ...(twitterHashtag !== undefined && { twitterHashtag }),
        ...(qrPageTweetTemplate !== undefined && { qrPageTweetTemplate }),
        ...(isActive !== undefined && { isActive }),
        ...(botAccountId !== undefined && { botAccountId }),
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
      project,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      {
        error: 'Failed to update project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/projects/[id]
 * Delete project (will cascade delete all related data)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
