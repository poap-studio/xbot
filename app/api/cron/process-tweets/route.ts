/**
 * Cron Job: Process Tweets
 * Automated bot execution triggered by Vercel Cron
 * Runs every 5 minutes to process eligible tweets
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchNewEligibleTweets } from '@/lib/twitter/search';
import { processSingleTweet } from '@/lib/bot/service';
import { validateBotConfiguration } from '@/lib/bot/service';
import { updateLastRun } from '@/lib/bot/status';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/cron/process-tweets
 * Protected endpoint for Vercel Cron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron job started:', new Date().toISOString());

    // Validate bot configuration
    try {
      await validateBotConfiguration();
    } catch (validationError) {
      console.error('Bot configuration invalid:', validationError);
      return NextResponse.json(
        {
          success: false,
          error: 'Bot configuration invalid',
          details: validationError instanceof Error ? validationError.message : 'Invalid configuration',
        },
        { status: 400 }
      );
    }

    // Search for eligible tweets
    console.log('🔍 Searching for eligible tweets...');
    const tweets = await searchNewEligibleTweets();

    if (tweets.length === 0) {
      console.log('✅ No new eligible tweets found');
      updateLastRun();
      return NextResponse.json({
        success: true,
        message: 'No eligible tweets found',
        processed: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📤 Processing ${tweets.length} tweets...`);

    // Process tweets
    const results = [];
    for (const tweet of tweets) {
      try {
        const result = await processSingleTweet(tweet);
        results.push(result);

        if (result.success) {
          console.log(`✅ Delivered POAP to @${result.username} for tweet ${result.tweetId}`);
        } else {
          console.log(`❌ Failed to process tweet ${result.tweetId}: ${result.error}`);
        }

        // Add delay between tweets (rate limiting)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing tweet ${tweet.id}:`, error);
        results.push({
          tweetId: tweet.id,
          username: tweet.authorUsername,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    updateLastRun();

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`✅ Cron job completed: ${processed} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} tweets successfully, ${failed} failed`,
      processed,
      failed,
      total: tweets.length,
      timestamp: new Date().toISOString(),
      results: results.map((r) => ({
        tweetId: r.tweetId,
        username: r.username,
        success: r.success,
        error: r.error || undefined,
      })),
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/process-tweets
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'process-tweets',
    message: 'Cron endpoint is healthy. Use POST with Bearer token to trigger.',
  });
}
