/**
 * API Route: Start Bot
 * Starts the bot in continuous mode
 */

import { NextResponse } from 'next/server';
import { validateBotConfiguration } from '@/lib/bot/service';
import { markBotRunning, getBotStatus } from '@/lib/bot/status';
import { runBotProcess } from '@/lib/bot/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/bot/start
 * Starts the bot in continuous mode
 */
export async function POST() {
  try {
    // Check if already running
    const status = await getBotStatus();
    if (status.isRunning) {
      return NextResponse.json(
        { error: 'Bot is already running' },
        { status: 400 }
      );
    }

    // Validate configuration
    try {
      await validateBotConfiguration();
    } catch (validationError) {
      return NextResponse.json(
        {
          error: 'Bot configuration is invalid',
          details: validationError instanceof Error ? validationError.message : 'Invalid configuration',
        },
        { status: 400 }
      );
    }

    // Start bot process (non-blocking)
    markBotRunning();

    // Run bot in background
    runBotProcess().catch((error) => {
      console.error('Bot process error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Bot started successfully',
    });
  } catch (error) {
    console.error('Error starting bot:', error);

    return NextResponse.json(
      {
        error: 'Failed to start bot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
