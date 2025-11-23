/**
 * API routes for managing bot account
 * GET - Retrieve current bot account info
 * DELETE - Disconnect bot account
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bot-account
 * Returns current connected bot account (without sensitive tokens)
 */
export async function GET(request: NextRequest) {
  try {
    const config = await prisma.config.findFirst();

    if (!config?.botAccountId) {
      return NextResponse.json({
        botAccount: null,
        message: 'No bot account connected',
      });
    }

    const botAccount = await prisma.botAccount.findUnique({
      where: { id: config.botAccountId },
      select: {
        id: true,
        twitterId: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        isConnected: true,
        lastUsedAt: true,
        connectedAt: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude sensitive fields
        accessToken: false,
        accessSecret: false,
      },
    });

    if (!botAccount) {
      // Config points to non-existent bot account, clean it up
      await prisma.config.update({
        where: { id: config.id },
        data: { botAccountId: null },
      });

      return NextResponse.json({
        botAccount: null,
        message: 'Bot account reference was invalid and has been cleared',
      });
    }

    return NextResponse.json({
      botAccount,
      message: 'Bot account retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching bot account:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bot account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bot-account
 * Disconnects the current bot account
 */
export async function DELETE(request: NextRequest) {
  try {
    const config = await prisma.config.findFirst();

    if (!config?.botAccountId) {
      return NextResponse.json(
        {
          error: 'No bot account connected',
          message: 'There is no bot account to disconnect',
        },
        { status: 404 }
      );
    }

    // Use a transaction to ensure atomicity
    const botAccountId = config.botAccountId; // Store before nulling

    await prisma.$transaction(async (tx) => {
      // Update config to remove bot account reference
      await tx.config.update({
        where: { id: config.id },
        data: { botAccountId: null },
      });

      // Mark bot account as disconnected (keep for audit trail)
      if (botAccountId) {
        await tx.botAccount.update({
          where: { id: botAccountId },
          data: {
            isConnected: false,
            lastUsedAt: new Date(), // Update last used to disconnection time
          },
        });
      }
    });

    console.log(`Bot account disconnected: ${config.botAccountId}`);

    return NextResponse.json({
      success: true,
      message: 'Bot account disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting bot account:', error);
    return NextResponse.json(
      {
        error: 'Failed to disconnect bot account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bot-account/reconnect
 * Marks a previously disconnected account as connected again
 * (Alternative to DELETE + new connection)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botAccountId } = body;

    if (!botAccountId) {
      return NextResponse.json(
        { error: 'botAccountId is required' },
        { status: 400 }
      );
    }

    // Verify bot account exists
    const botAccount = await prisma.botAccount.findUnique({
      where: { id: botAccountId },
    });

    if (!botAccount) {
      return NextResponse.json(
        { error: 'Bot account not found' },
        { status: 404 }
      );
    }

    // Update config and bot account
    await prisma.$transaction(async (tx) => {
      // Update config to use this bot account
      await tx.config.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          poapEventId: '',
          poapEditCode: '',
          botAccountId: botAccount.id,
        },
        update: {
          botAccountId: botAccount.id,
        },
      });

      // Mark as connected
      await tx.botAccount.update({
        where: { id: botAccount.id },
        data: {
          isConnected: true,
          connectedAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Bot account reconnected successfully',
    });
  } catch (error) {
    console.error('Error reconnecting bot account:', error);
    return NextResponse.json(
      {
        error: 'Failed to reconnect bot account',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
