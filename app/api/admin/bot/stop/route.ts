/**
 * API Route: Stop Bot
 * Stops the bot process
 */

import { NextResponse } from 'next/server';
import { markBotStopped, getBotStatus } from '@/lib/bot/status';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/bot/stop
 * Stops the bot process
 */
export async function POST() {
  try {
    // Check if running
    const status = await getBotStatus();
    if (!status.isRunning) {
      return NextResponse.json(
        { error: 'Bot is not running' },
        { status: 400 }
      );
    }

    // Stop bot
    markBotStopped();

    return NextResponse.json({
      success: true,
      message: 'Bot stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping bot:', error);

    return NextResponse.json(
      {
        error: 'Failed to stop bot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
