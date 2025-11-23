/**
 * Bot Configuration API
 * GET: Fetch bot configuration and status
 * POST: Update bot configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBotStatus } from '@/lib/bot/status';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bot/config
 * Fetch bot configuration including messages and status
 */
export async function GET() {
  try {
    // Get configuration from database
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    // Get bot status
    const status = await getBotStatus();

    // Get bot account info
    const botAccount = await prisma.botAccount.findFirst({
      where: { isConnected: true },
    });

    // Get today's stats from cron logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await prisma.cronLog.findMany({
      where: {
        startedAt: {
          gte: today,
        },
      },
    });

    const processedToday = todayLogs.reduce((sum, log) => sum + (log.processed || 0), 0);
    const errors = todayLogs.filter(log => log.status === 'error').length;

    return NextResponse.json({
      twitterHashtag: config.twitterHashtag,
      botReplyEligible: config.botReplyEligible,
      botReplyNotEligible: config.botReplyNotEligible,
      botConnected: !!botAccount,
      botUsername: botAccount?.username,
      lastRun: status.lastRun,
      processedToday,
      errors,
    });
  } catch (error) {
    console.error('Error fetching bot config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/bot/config
 * Update bot configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { twitterHashtag, botReplyEligible, botReplyNotEligible } = body;

    // Validate input
    if (!twitterHashtag || !twitterHashtag.startsWith('#')) {
      return NextResponse.json(
        { error: 'Hashtag must start with #' },
        { status: 400 }
      );
    }

    if (!botReplyEligible || !botReplyEligible.includes('{{claimUrl}}')) {
      return NextResponse.json(
        { error: 'Eligible message must include {{claimUrl}} placeholder' },
        { status: 400 }
      );
    }

    if (!botReplyNotEligible) {
      return NextResponse.json(
        { error: 'Not eligible message is required' },
        { status: 400 }
      );
    }

    // Get existing config
    const config = await prisma.config.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    // Update configuration
    await prisma.config.update({
      where: { id: config.id },
      data: {
        twitterHashtag,
        botReplyEligible,
        botReplyNotEligible,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating bot config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
