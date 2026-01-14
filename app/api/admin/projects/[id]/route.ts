/**
 * API Route: Single Project Management
 * GET - Get project details
 * PUT - Update project
 * DELETE - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { registerWebhook, deleteWebhook, subscribeWebhook } from '@/lib/twitter/webhooks';
import { decrypt } from '@/lib/crypto';

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
      requireUniqueCode,
      requireImage,
    } = body;

    // Get current state before update (to detect bot changes)
    const currentProject = await prisma.project.findUnique({
      where: { id },
      select: { botAccountId: true },
    });

    if (!currentProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const oldBotId = currentProject.botAccountId;
    const newBotId = botAccountId;
    const botChanged = botAccountId !== undefined && oldBotId !== newBotId;

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
        ...(requireUniqueCode !== undefined && { requireUniqueCode }),
        ...(requireImage !== undefined && { requireImage }),
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

    // Manage webhooks if bot assignment changed
    if (botChanged) {
      // Handle old bot (if it had one)
      if (oldBotId) {
        const oldBot = await prisma.botAccount.findUnique({
          where: { id: oldBotId },
          include: {
            _count: { select: { projects: true } },
          },
        });

        // If old bot now has no projects, delete its webhook
        if (oldBot && oldBot._count.projects === 0 && oldBot.webhookId) {
          console.log(`Bot ${oldBot.username} has no projects, deleting webhook ${oldBot.webhookId}`);
          const deleted = await deleteWebhook(oldBot.webhookId);
          if (deleted) {
            await prisma.botAccount.update({
              where: { id: oldBotId },
              data: { webhookId: null },
            });
          }
        }
      }

      // Handle new bot (if one was assigned)
      if (newBotId) {
        const newBot = await prisma.botAccount.findUnique({
          where: { id: newBotId },
          include: {
            _count: { select: { projects: true } },
          },
        });

        // If new bot has exactly 1 project (this one) and no webhook, set one up
        if (newBot && newBot._count.projects === 1 && !newBot.webhookId) {
          console.log(`Bot ${newBot.username} is being used for first time, setting up webhook`);

          let webhookId: string | null = null;

          // STEP 1: Check if a webhook already exists in Twitter
          const { listWebhooks } = await import('@/lib/twitter/webhooks');
          const existingWebhooks = await listWebhooks();

          if (existingWebhooks.length > 0) {
            // Reuse existing webhook
            webhookId = existingWebhooks[0].id;
            console.log(`Reusing existing webhook: ${webhookId}`);
          } else {
            // STEP 2: No webhook exists, create a new one
            console.log(`No existing webhook found, creating new one`);
            webhookId = await registerWebhook();

            if (!webhookId) {
              console.error(`Failed to register webhook for bot ${newBot.username}`);
            } else {
              console.log(`Created new webhook: ${webhookId}`);
            }
          }

          // STEP 3: Subscribe bot to webhook (if we have one)
          if (webhookId) {
            // Decrypt bot credentials
            const accessToken = decrypt(newBot.accessToken);
            const accessSecret = decrypt(newBot.accessSecret);

            // Subscribe the bot to the webhook
            const subscribed = await subscribeWebhook(webhookId, accessToken, accessSecret);

            // IMPORTANT: subscription might fail with "already subscribed" - this is OK
            // Save webhook ID regardless, as bot is subscribed
            await prisma.botAccount.update({
              where: { id: newBotId },
              data: { webhookId },
            });

            if (subscribed) {
              console.log(`✅ Webhook ${webhookId} subscribed for bot ${newBot.username}`);
            } else {
              // Subscription failed, but might be "already subscribed" which is fine
              console.log(`⚠️  Subscription returned false for bot ${newBot.username} - might already be subscribed, webhookId saved anyway`);
            }
          }
        } else if (newBot && newBot.webhookId) {
          console.log(`Bot ${newBot.username} already has webhook ${newBot.webhookId}`);
        }
      }
    }

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
