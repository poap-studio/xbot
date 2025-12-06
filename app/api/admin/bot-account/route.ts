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
    // Get all bot accounts (multi-project support)
    const botAccounts = await prisma.botAccount.findMany({
      where: { isConnected: true },
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

    return NextResponse.json({
      botAccounts,
      message: 'Bot accounts retrieved successfully',
    });
  } catch (error) {
    console.error('Error fetching bot accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch bot accounts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/bot-account
 * Disconnects a bot account by ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botAccountId = searchParams.get('id');

    if (!botAccountId) {
      return NextResponse.json(
        {
          error: 'Bot account ID is required',
          message: 'Please provide a bot account ID to disconnect',
        },
        { status: 400 }
      );
    }

    // Mark bot account as disconnected (keep for audit trail)
    await prisma.botAccount.update({
      where: { id: botAccountId },
      data: {
        isConnected: false,
        lastUsedAt: new Date(), // Update last used to disconnection time
      },
    });

    console.log(`Bot account disconnected: ${botAccountId}`);

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

    // Mark as connected
    await prisma.botAccount.update({
      where: { id: botAccount.id },
      data: {
        isConnected: true,
        connectedAt: new Date(),
      },
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
