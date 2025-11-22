/**
 * API Route: Run Bot Once
 * Runs the bot once without continuous monitoring
 */

import { NextResponse } from 'next/server';
import { validateBotConfiguration } from '@/lib/bot/service';
import { getBotStatus, updateLastRun } from '@/lib/bot/status';
import { searchNewEligibleTweets } from '@/lib/twitter/search';
import { processSingleTweet } from '@/lib/bot/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/admin/bot/run-once
 * Runs the bot once
 */
export async function POST() {
  try {
    // Check if already running
    const status = await getBotStatus();
    if (status.isRunning) {
      return NextResponse.json(
        { error: 'Bot is already running in continuous mode' },
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

    // Search for eligible tweets
    const tweets = await searchNewEligibleTweets();

    if (tweets.length === 0) {
      updateLastRun();
      return NextResponse.json({
        success: true,
        message: 'No eligible tweets found',
        processed: 0,
        failed: 0,
      });
    }

    // Process tweets
    const results = [];
    for (const tweet of tweets) {
      const result = await processSingleTweet(tweet);
      results.push(result);

      // Add delay between tweets (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    updateLastRun();

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} tweets successfully, ${failed} failed`,
      processed,
      failed,
      results,
    });
  } catch (error) {
    console.error('Error running bot:', error);

    return NextResponse.json(
      {
        error: 'Failed to run bot',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
