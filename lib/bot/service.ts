/**
 * Bot Service
 * Orchestrates the complete POAP delivery process
 */

import { searchNewEligibleTweets, saveTweets, type ProcessedTweet } from '@/lib/twitter/search';
import { replyWithClaimUrl, hasBeenRepliedTo } from '@/lib/twitter/reply';
import { reserveMintLink } from '@/lib/poap/api';
import { recordDelivery, hasDelivery } from './delivery';
import prisma from '@/lib/prisma';

/**
 * Mark a hidden code as used
 * @param {string} code - The hidden code to mark as used
 * @param {string} twitterId - The Twitter user ID who used it
 */
async function markHiddenCodeAsUsed(code: string, twitterId: string): Promise<void> {
  try {
    await prisma.validCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedBy: twitterId,
        usedAt: new Date(),
      },
    });
    console.log(`Hidden code "${code}" marked as used by ${twitterId}`);
  } catch (error) {
    console.error(`Failed to mark hidden code as used:`, error);
    throw error;
  }
}

export interface ProcessResult {
  tweetsFound: number;
  tweetsEligible: number;
  deliveriesSuccessful: number;
  deliveriesFailed: number;
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
    // 1. Check if already delivered
    const alreadyDelivered = await hasDelivery(tweetId);
    if (alreadyDelivered) {
      console.log(`Tweet ${tweetId} already has a delivery. Skipping.`);
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
      console.log(`Tweet ${tweetId} already replied to. Skipping.`);
      return {
        tweetId,
        username,
        success: false,
        error: 'Already replied',
      };
    }

    // 3. Reserve mint link
    const mintLink = await reserveMintLink(twitterUserId);
    if (!mintLink) {
      console.warn(`No available mint links for tweet ${tweetId}`);
      return {
        tweetId,
        username,
        success: false,
        error: 'No mint links available',
      };
    }

    // 4. Reply to tweet with claim URL
    const replyId = await replyWithClaimUrl(tweetId, mintLink);

    // 5. Extract qrHash from mint link
    // Format: https://poap.xyz/claim/abc123 or https://app.poap.xyz/claim/abc123
    const qrHash = mintLink.split('/claim/')[1];
    if (!qrHash) {
      throw new Error('Invalid mint link format');
    }

    // 6. Record delivery
    await recordDelivery(twitterUserId, username, tweetId, mintLink, qrHash);

    // 7. Mark hidden code as used (if present)
    if (tweet.hiddenCode) {
      await markHiddenCodeAsUsed(tweet.hiddenCode, twitterUserId);
    }

    console.log(
      `✅ Successfully delivered POAP to @${username} for tweet ${tweetId}`
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

    console.error(
      `❌ Failed to process tweet ${tweetId} from @${username}:`,
      errorMessage
    );

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
    deliveriesSuccessful: 0,
    deliveriesFailed: 0,
    errors: [],
  };

  try {
    // 1. Search for new eligible tweets
    console.log('🔍 Searching for new eligible tweets...');
    const tweets = await searchNewEligibleTweets();

    result.tweetsFound = tweets.length;
    result.tweetsEligible = tweets.filter((t) => t.isEligible).length;

    if (tweets.length === 0) {
      console.log('✅ No new eligible tweets found');
      return result;
    }

    // 2. Save all tweets to database
    await saveTweets(tweets);
    console.log(`💾 Saved ${tweets.length} tweets to database`);

    // 3. Process eligible tweets (respecting max limit)
    const eligibleTweets = tweets.filter((t) => t.isEligible);
    const tweetsToProcess = eligibleTweets.slice(0, maxTweets);

    console.log(
      `📤 Processing ${tweetsToProcess.length} eligible tweets (max: ${maxTweets})...`
    );

    for (const tweet of tweetsToProcess) {
      const attempt = await processSingleTweet(tweet);

      if (attempt.success) {
        result.deliveriesSuccessful++;
      } else {
        result.deliveriesFailed++;
        if (attempt.error) {
          result.errors.push({
            tweetId: attempt.tweetId,
            error: attempt.error,
          });
        }
      }

      // Rate limiting: wait 2 seconds between tweets
      if (tweetsToProcess.indexOf(tweet) < tweetsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Bot process completed');
    console.log(`   - Tweets found: ${result.tweetsFound}`);
    console.log(`   - Eligible: ${result.tweetsEligible}`);
    console.log(`   - Delivered: ${result.deliveriesSuccessful}`);
    console.log(`   - Failed: ${result.deliveriesFailed}`);

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

  // Check configuration exists
  const config = await prisma.config.findFirst();
  if (!config) {
    errors.push('Bot configuration not found');
  }

  // Check POAP credentials
  if (!config?.poapClientId || !config?.poapClientSecret) {
    errors.push('POAP API credentials not configured');
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
