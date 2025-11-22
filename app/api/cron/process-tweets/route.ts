/**
 * Cron Job: Process Tweets
 * Automated bot execution triggered by Vercel Cron
 * Runs every minute to process eligible tweets
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchNewEligibleTweets } from '@/lib/twitter/search';
import { processSingleTweet } from '@/lib/bot/service';
import { validateBotConfiguration } from '@/lib/bot/service';
import { updateLastRun } from '@/lib/bot/status';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute

/**
 * POST /api/cron/process-tweets
 * Protected endpoint for Vercel Cron
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let cronLog;

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('CRON_SECRET not configured');
      // Log error
      await prisma.cronLog.create({
        data: {
          status: 'error',
          errorMessage: 'CRON_SECRET not configured',
          completedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });
      return NextResponse.json(
        { error: 'Cron configuration error' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid cron authorization');
      // Log unauthorized attempt
      await prisma.cronLog.create({
        data: {
          status: 'error',
          errorMessage: 'Unauthorized access attempt',
          completedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron job started:', new Date().toISOString());

    // Create log entry
    cronLog = await prisma.cronLog.create({
      data: {
        status: 'success', // Will be updated if errors occur
      },
    });

    // Validate bot configuration
    try {
      await validateBotConfiguration();
    } catch (validationError) {
      console.error('Bot configuration invalid:', validationError);

      // Update log with validation error
      if (cronLog) {
        await prisma.cronLog.update({
          where: { id: cronLog.id },
          data: {
            status: 'error',
            errorMessage: 'Bot configuration invalid',
            errorDetails: validationError instanceof Error ? validationError.message : 'Invalid configuration',
            completedAt: new Date(),
            executionTime: Date.now() - startTime,
          },
        });
      }

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

      // Update log with no tweets found
      if (cronLog) {
        await prisma.cronLog.update({
          where: { id: cronLog.id },
          data: {
            status: 'success',
            tweetsFound: 0,
            processed: 0,
            failed: 0,
            completedAt: new Date(),
            executionTime: Date.now() - startTime,
          },
        });
      }

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

    // Update log with results
    const hasErrors = failed > 0;
    const errorResults = results.filter((r) => !r.success);

    if (cronLog) {
      await prisma.cronLog.update({
        where: { id: cronLog.id },
        data: {
          status: hasErrors ? 'warning' : 'success',
          tweetsFound: tweets.length,
          processed,
          failed,
          errorMessage: hasErrors ? `${failed} tweet(s) failed to process` : null,
          errorDetails: hasErrors ? JSON.stringify(errorResults) : null,
          completedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });
    }

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

    // Log critical error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (cronLog) {
      await prisma.cronLog.update({
        where: { id: cronLog.id },
        data: {
          status: 'error',
          errorMessage: `Critical error: ${errorMessage}`,
          errorDetails: errorStack,
          completedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });
    } else {
      // If cronLog wasn't created, create one now
      await prisma.cronLog.create({
        data: {
          status: 'error',
          errorMessage: `Critical error: ${errorMessage}`,
          errorDetails: errorStack,
          completedAt: new Date(),
          executionTime: Date.now() - startTime,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: errorMessage,
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
