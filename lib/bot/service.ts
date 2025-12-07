/**
 * Bot Service
 * Orchestrates the complete POAP delivery process
 */

import { searchNewEligibleTweets, saveTweets, type ProcessedTweet } from '@/lib/twitter/search';
import { replyWithClaimUrl, replyWithAlreadyClaimed, replyWithNotEligible, hasBeenRepliedTo } from '@/lib/twitter/reply';
import { reserveMintLink } from '@/lib/poap/api';
import { recordDelivery, hasDelivery, userHasDelivery } from './delivery';
import prisma from '@/lib/prisma';

/**
 * Mark a hidden code as used
 * @param {string} code - The hidden code to mark as used
 * @param {string} twitterId - The Twitter user ID who used it
 * @param {string} projectId - The project ID
 */
async function markHiddenCodeAsUsed(code: string, twitterId: string, projectId: string): Promise<void> {
  try {
    // Update using code (globally unique) and verify it belongs to the correct project
    await prisma.validCode.updateMany({
      where: { code, projectId },
      data: {
        isUsed: true,
        usedBy: twitterId,
        usedAt: new Date(),
      },
    });
    console.log(`Hidden code "${code}" marked as used by ${twitterId} for project ${projectId}`);
  } catch (error) {
    console.error(`Failed to mark hidden code as used:`, error);
    throw error;
  }
}

export interface ProcessResult {
  tweetsFound: number;
  tweetsEligible: number;
  tweetsNotEligible: number;
  deliveriesSuccessful: number;
  deliveriesFailed: number;
  notEligibleReplies: number;
  errors: Array<{
    tweetId: string;
    error: string;
  }>;
}

export interface DeliveryAttempt {
  tweetId: string;
  username: string;
  success: boolean;
  error?: string;
  mintLink?: string;
  replyId?: string;
}

/**
 * Process a single non-eligible tweet
 * Replies with "not eligible" message
 * @param {ProcessedTweet} tweet - Tweet to process
 * @param {string} projectId - Optional project ID to use for template
 * @param {string} botAccountId - Optional bot account ID to use for replying
 * @returns {Promise<boolean>} True if reply was successful
 */
export async function processNotEligibleTweet(
  tweet: ProcessedTweet,
  projectId?: string,
  botAccountId?: string
): Promise<boolean> {
  const tweetId = tweet.id;
  const username = tweet.authorUsername;

  try {
    // 1. Check if already replied
    const alreadyReplied = await hasBeenRepliedTo(tweetId);
    if (alreadyReplied) {
      console.log(`Tweet ${tweetId} already replied to. Skipping.`);
      return false;
    }

    // 2. Reply with "not eligible" message
    await replyWithNotEligible(tweetId, botAccountId, projectId);

    console.log(
      `✅ Replied to non-eligible tweet ${tweetId} from @${username}`
    );

    return true;
  } catch (error) {
    // Silently skip - failed to reply to non-eligible tweet (expected behavior)
    return false;
  }
}

/**
 * Process a single eligible tweet
 * Reserves mint link, replies with claim URL, and records delivery
 * @param {ProcessedTweet} tweet - Tweet to process
 * @returns {Promise<DeliveryAttempt>} Delivery attempt result
 */
export async function processSingleTweet(
  tweet: ProcessedTweet
): Promise<DeliveryAttempt> {
  const tweetId = tweet.id;
  const username = tweet.authorUsername;
  const twitterUserId = tweet.authorId;

  try {
    // 0. Find project for this tweet based on hidden code
    if (!tweet.hiddenCode) {
      // Silently skip tweets without valid code - this is expected behavior
      return {
        tweetId,
        username,
        success: false,
        error: 'No hidden code',
      };
    }

    const validCode = await prisma.validCode.findFirst({
      where: { code: tweet.hiddenCode },
      include: { project: true },
    });

    if (!validCode || !validCode.project) {
      // Silently skip tweets with invalid code - this is expected behavior
      return {
        tweetId,
        username,
        success: false,
        error: 'Invalid code',
      };
    }

    // CRITICAL: Check if the code has been used by another tweet (race condition check)
    // This can happen if multiple tweets with same code arrived in same batch
    if (validCode.isUsed) {
      console.log(
        `Code "${tweet.hiddenCode}" already used by another tweet. Replying with not eligible message to @${username}`
      );

      // Reply with "not eligible" message since code is already used
      try {
        await replyWithNotEligible(tweetId, validCode.project.botAccountId || undefined);
      } catch (error) {
        console.error(`Failed to reply to tweet ${tweetId}:`, error);
      }

      return {
        tweetId,
        username,
        success: false,
        error: 'Code already used',
      };
    }

    const projectId = validCode.projectId;
    const project = validCode.project;

    console.log(`Processing tweet ${tweetId} for project "${project.name}" (${projectId})`);

    // 1. Check if already delivered for this project
    const alreadyDelivered = await hasDelivery(tweetId, projectId);
    if (alreadyDelivered) {
      // Silently skip - already processed
      return {
        tweetId,
        username,
        success: false,
        error: 'Already delivered',
      };
    }

    // 2. Check if already replied (safety check)
    const alreadyReplied = await hasBeenRepliedTo(tweetId);
    if (alreadyReplied) {
      // Silently skip - already processed
      return {
        tweetId,
        username,
        success: false,
        error: 'Already replied',
      };
    }

    // 3. Check if multiple claims are allowed for this project
    // If multiple claims are NOT allowed, check if user already has a delivery for this project
    if (!project.allowMultipleClaims) {
      const userAlreadyClaimed = await prisma.delivery.findFirst({
        where: {
          twitterUser: { twitterId: twitterUserId },
          projectId,
        },
      });

      if (userAlreadyClaimed) {
        // Reply with "already claimed" message
        const replyId = await replyWithAlreadyClaimed(tweetId, project.botAccountId || undefined);

        return {
          tweetId,
          username,
          success: false,
          error: 'User already claimed',
          replyId,
        };
      }
    }

    // 4. Reserve mint link for this project
    const mintLink = await reserveMintLink(twitterUserId, projectId);
    if (!mintLink) {
      // Silently skip - no mint links available
      return {
        tweetId,
        username,
        success: false,
        error: 'No mint links available',
      };
    }

    // 5. Reply to tweet with claim URL (using website URL instead of direct mint link)
    const websiteUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://xbot.poap.studio';
    const replyId = await replyWithClaimUrl(tweetId, websiteUrl, project.botAccountId || undefined);

    // 6. Extract qrHash from mint link
    // Format: https://poap.xyz/claim/abc123 or https://app.poap.xyz/claim/abc123
    const qrHash = mintLink.split('/claim/')[1];
    if (!qrHash) {
      throw new Error('Invalid mint link format');
    }

    // 7. Record delivery with project ID
    await recordDelivery(twitterUserId, username, tweetId, mintLink, qrHash, projectId);

    // 8. Mark hidden code as used
    await markHiddenCodeAsUsed(tweet.hiddenCode, twitterUserId, projectId);

    console.log(
      `✅ Successfully delivered POAP to @${username} for tweet ${tweetId} (project: ${project.name})`
    );

    return {
      tweetId,
      username,
      success: true,
      mintLink,
      replyId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Only log actual errors (not expected failures like missing codes)
    if (!errorMessage.includes('hidden code') && !errorMessage.includes('Invalid code')) {
      console.error(
        `❌ Failed to process tweet ${tweetId} from @${username}:`,
        errorMessage
      );
    }

    return {
      tweetId,
      username,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Main bot process - searches for eligible tweets and delivers POAPs
 * Also replies to non-eligible tweets with appropriate message
 * @param {number} maxTweets - Maximum number of tweets to process (default: 10)
 * @returns {Promise<ProcessResult>} Process results
 */
export async function runBotProcess(
  maxTweets: number = 10
): Promise<ProcessResult> {
  console.log('🤖 Starting bot process...');

  const result: ProcessResult = {
    tweetsFound: 0,
    tweetsEligible: 0,
    tweetsNotEligible: 0,
    deliveriesSuccessful: 0,
    deliveriesFailed: 0,
    notEligibleReplies: 0,
    errors: [],
  };

  try {
    // 1. Search for new tweets (both eligible and non-eligible)
    console.log('🔍 Searching for new tweets...');
    const tweets = await searchNewEligibleTweets();

    result.tweetsFound = tweets.length;
    result.tweetsEligible = tweets.filter((t) => t.isEligible).length;
    result.tweetsNotEligible = tweets.filter((t) => !t.isEligible).length;

    if (tweets.length === 0) {
      console.log('✅ No new tweets found');
      return result;
    }

    // 2. Save all tweets to database
    await saveTweets(tweets);
    console.log(`💾 Saved ${tweets.length} tweets to database`);

    // 3. Process eligible tweets (respecting max limit)
    // IMPORTANT: Sort by createdAt (oldest first) to ensure first tweet wins if multiple use same code
    const eligibleTweets = tweets
      .filter((t) => t.isEligible)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const tweetsToProcess = eligibleTweets.slice(0, maxTweets);

    console.log(
      `📤 Processing ${tweetsToProcess.length} eligible tweets (max: ${maxTweets}) in chronological order...`
    );

    for (const tweet of tweetsToProcess) {
      const attempt = await processSingleTweet(tweet);

      if (attempt.success) {
        result.deliveriesSuccessful++;
      } else {
        result.deliveriesFailed++;
        // Only track actual errors, not expected skips
        if (attempt.error &&
            !['No hidden code', 'Invalid code', 'Code already used', 'Already delivered', 'Already replied', 'No mint links available'].includes(attempt.error)) {
          result.errors.push({
            tweetId: attempt.tweetId,
            error: attempt.error,
          });
        }
      }

      // Rate limiting: wait 2 seconds between tweets
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 4. Process non-eligible tweets (reply with "not eligible" message)
    // Also sort by timestamp for consistency
    const notEligibleTweets = tweets
      .filter((t) => !t.isEligible)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const notEligibleToProcess = notEligibleTweets.slice(0, maxTweets);

    if (notEligibleToProcess.length > 0) {
      console.log(
        `📨 Replying to ${notEligibleToProcess.length} non-eligible tweets...`
      );

      for (const tweet of notEligibleToProcess) {
        const success = await processNotEligibleTweet(tweet);

        if (success) {
          result.notEligibleReplies++;
        }

        // Rate limiting: wait 2 seconds between tweets
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Bot process completed');
    console.log(`   - Tweets found: ${result.tweetsFound}`);
    console.log(`   - Eligible: ${result.tweetsEligible}`);
    console.log(`   - Not eligible: ${result.tweetsNotEligible}`);
    console.log(`   - Delivered: ${result.deliveriesSuccessful}`);
    console.log(`   - Failed: ${result.deliveriesFailed}`);
    console.log(`   - Not eligible replies: ${result.notEligibleReplies}`);

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Bot process failed:', errorMessage);

    result.errors.push({
      tweetId: 'PROCESS',
      error: errorMessage,
    });

    return result;
  }
}

/**
 * Validate bot configuration before running
 * @returns {Promise<void>}
 * @throws {Error} If configuration is invalid
 */
export async function validateBotConfiguration(): Promise<void> {
  // This will be implemented to check:
  // - Bot account is connected
  // - POAP credentials are set
  // - Config values are valid
  // - Mint links are available

  const errors: string[] = [];

  // Check environment variables
  if (!process.env.TWITTER_BEARER_TOKEN) {
    errors.push('TWITTER_BEARER_TOKEN not set');
  }
  if (!process.env.TWITTER_API_KEY) {
    errors.push('TWITTER_API_KEY not set');
  }
  if (!process.env.TWITTER_API_SECRET) {
    errors.push('TWITTER_API_SECRET not set');
  }

  // Import here to avoid circular dependencies
  const { isBotConnected } = await import('@/lib/twitter/client');
  const { getMintLinkStats } = await import('@/lib/poap/api');
  const prisma = (await import('@/lib/prisma')).default;

  // Check bot connection
  const botConnected = await isBotConnected();
  if (!botConnected) {
    errors.push('Bot account is not connected');
  }

  // Check if there are any active projects configured
  const activeProjects = await prisma.project.findMany({
    where: { isActive: true },
    include: {
      botAccount: true,
    },
  });

  if (activeProjects.length === 0) {
    errors.push('No active projects configured');
  } else {
    // Warn about projects without bot assigned (these will be skipped)
    const projectsWithoutBot = activeProjects.filter(p => !p.botAccountId);
    if (projectsWithoutBot.length > 0) {
      console.warn(`⚠️  ${projectsWithoutBot.length} active project(s) do not have a bot assigned and will be skipped`);
    }

    // Warn about projects with disconnected bot (these will be skipped)
    const projectsWithDisconnectedBot = activeProjects.filter(
      p => p.botAccount && !p.botAccount.isConnected
    );
    if (projectsWithDisconnectedBot.length > 0) {
      console.warn(`⚠️  ${projectsWithDisconnectedBot.length} active project(s) have a disconnected bot and will be skipped`);
    }

    // Only fail if there are NO processable projects
    const processableProjects = activeProjects.filter(
      p => p.botAccountId && p.botAccount && p.botAccount.isConnected
    );
    if (processableProjects.length === 0) {
      errors.push('No active projects with connected bots available to process');
    }
  }

  // Check POAP credentials (now from environment variables)
  if (!process.env.POAP_CLIENT_ID || !process.env.POAP_CLIENT_SECRET) {
    errors.push('POAP API credentials not configured (POAP_CLIENT_ID or POAP_CLIENT_SECRET missing)');
  }

  if (!process.env.POAP_API_KEY) {
    errors.push('POAP_API_KEY not configured');
  }

  // Check mint links availability
  const stats = await getMintLinkStats();
  if (stats.available === 0) {
    errors.push('No mint links available');
  }

  if (errors.length > 0) {
    throw new Error(
      `Bot configuration invalid:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }

  console.log('✅ Bot configuration validated');
}
