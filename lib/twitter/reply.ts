/**
 * Twitter Reply Service
 * Handles replying to tweets with the bot account
 */

import { getBotClient } from './client';
import prisma from '@/lib/prisma';

export interface ReplyOptions {
  tweetId: string;
  text: string;
}

/**
 * Reply to a tweet with the bot account
 * @param {string} tweetId - ID of tweet to reply to
 * @param {string} text - Reply text
 * @returns {Promise<string>} ID of the reply tweet
 * @throws {Error} If reply fails
 */
export async function replyToTweet(
  tweetId: string,
  text: string
): Promise<string> {
  try {
    if (!tweetId) {
      throw new Error('Tweet ID is required');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Reply text is required');
    }

    if (text.length > 280) {
      throw new Error(`Reply text too long: ${text.length} characters (max: 280)`);
    }

    const client = await getBotClient();

    console.log(`Replying to tweet ${tweetId} with text: "${text}"`);

    // Post reply
    const response = await client.v2.reply(text, tweetId);

    if (!response.data?.id) {
      throw new Error('Reply response missing tweet ID');
    }

    const replyId = response.data.id;

    console.log(`Successfully replied to tweet ${tweetId}, reply ID: ${replyId}`);

    return replyId;
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific Twitter API errors
      if (error.message.includes('429')) {
        throw new Error('Twitter API rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('403')) {
        throw new Error(
          'Permission denied. Bot account may not have write permissions.'
        );
      }
      if (error.message.includes('404')) {
        throw new Error('Tweet not found or has been deleted.');
      }
      throw new Error(`Failed to reply to tweet: ${error.message}`);
    }
    throw new Error('Failed to reply to tweet: Unknown error');
  }
}

/**
 * Mark tweet as replied in database
 * @param {string} tweetId - Original tweet ID
 * @param {string} replyTweetId - Reply tweet ID
 * @returns {Promise<void>}
 */
export async function markTweetAsReplied(
  tweetId: string,
  replyTweetId: string
): Promise<void> {
  try {
    await prisma.tweet.update({
      where: { tweetId },
      data: {
        botReplied: true,
        botReplyTweetId: replyTweetId,
      },
    });

    console.log(`Tweet ${tweetId} marked as replied`);
  } catch (error) {
    console.error(`Failed to mark tweet ${tweetId} as replied:`, error);
    throw error;
  }
}

/**
 * Generate reply text for a claim URL
 * Uses template from config with {{claimUrl}} placeholder
 * @param {string} claimUrl - POAP claim URL
 * @returns {Promise<string>} Reply text
 */
export async function generateReplyText(claimUrl: string): Promise<string> {
  try {
    const config = await prisma.config.findFirst();

    if (!config) {
      throw new Error('Configuration not found');
    }

    // Replace placeholder with actual claim URL
    const text = config.botReplyEligible.replace('{{claimUrl}}', claimUrl);

    // Validate length
    if (text.length > 280) {
      console.warn(
        `Generated reply text is too long (${text.length} chars). Truncating...`
      );
      return text.substring(0, 277) + '...';
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate reply text: ${error.message}`);
    }
    throw new Error('Failed to generate reply text: Unknown error');
  }
}

/**
 * Reply to a tweet with a POAP claim URL
 * @param {string} tweetId - Tweet ID to reply to
 * @param {string} claimUrl - POAP claim URL
 * @returns {Promise<string>} Reply tweet ID
 */
export async function replyWithClaimUrl(
  tweetId: string,
  claimUrl: string
): Promise<string> {
  try {
    const text = await generateReplyText(claimUrl);
    const replyId = await replyToTweet(tweetId, text);
    await markTweetAsReplied(tweetId, replyId);

    return replyId;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reply with claim URL: ${error.message}`);
    }
    throw new Error('Failed to reply with claim URL: Unknown error');
  }
}

/**
 * Generate "already claimed" reply text
 * Uses template from config
 * @returns {Promise<string>} Reply text
 */
export async function generateAlreadyClaimedText(): Promise<string> {
  try {
    const config = await prisma.config.findFirst();

    if (!config) {
      throw new Error('Configuration not found');
    }

    const text = config.botReplyAlreadyClaimed || 'You have already claimed a POAP for this event. Only one claim per user is allowed.';

    // Validate length
    if (text.length > 280) {
      console.warn(
        `Generated "already claimed" reply text is too long (${text.length} chars). Truncating...`
      );
      return text.substring(0, 277) + '...';
    }

    return text;
  } catch (error) {
    console.error('Failed to generate "already claimed" reply text:', error);
    return 'You have already claimed a POAP for this event. Only one claim per user is allowed.';
  }
}

/**
 * Reply to a tweet with "already claimed" message
 * @param {string} tweetId - Tweet ID to reply to
 * @returns {Promise<string>} Reply tweet ID
 */
export async function replyWithAlreadyClaimed(
  tweetId: string
): Promise<string> {
  try {
    const text = await generateAlreadyClaimedText();
    const replyId = await replyToTweet(tweetId, text);
    await markTweetAsReplied(tweetId, replyId);

    return replyId;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reply with already claimed message: ${error.message}`);
    }
    throw new Error('Failed to reply with already claimed message: Unknown error');
  }
}

/**
 * Generate "not eligible" reply text
 * Uses template from config
 * @returns {Promise<string>} Reply text
 */
export async function generateNotEligibleText(): Promise<string> {
  try {
    const config = await prisma.config.findFirst();

    if (!config) {
      throw new Error('Configuration not found');
    }

    const text = config.botReplyNotEligible || 'Thank you for your interest. Make sure to include a valid code and an image in your tweet.';

    // Validate length
    if (text.length > 280) {
      console.warn(
        `Generated "not eligible" reply text is too long (${text.length} chars). Truncating...`
      );
      return text.substring(0, 277) + '...';
    }

    return text;
  } catch (error) {
    console.error('Failed to generate "not eligible" reply text:', error);
    return 'Thank you for your interest. Make sure to include a valid code and an image in your tweet.';
  }
}

/**
 * Reply to a tweet with "not eligible" message
 * @param {string} tweetId - Tweet ID to reply to
 * @returns {Promise<string>} Reply tweet ID
 */
export async function replyWithNotEligible(
  tweetId: string
): Promise<string> {
  try {
    const text = await generateNotEligibleText();
    const replyId = await replyToTweet(tweetId, text);
    await markTweetAsReplied(tweetId, replyId);

    return replyId;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to reply with not eligible message: ${error.message}`);
    }
    throw new Error('Failed to reply with not eligible message: Unknown error');
  }
}

/**
 * Check if tweet has already been replied to
 * @param {string} tweetId - Tweet ID
 * @returns {Promise<boolean>} True if already replied
 */
export async function hasBeenRepliedTo(tweetId: string): Promise<boolean> {
  try {
    const tweet = await prisma.tweet.findUnique({
      where: { tweetId },
      select: { botReplied: true },
    });

    return tweet?.botReplied || false;
  } catch (error) {
    console.error(`Error checking if tweet ${tweetId} has been replied to:`, error);
    return false;
  }
}

/**
 * Get tweets that are eligible but haven't been replied to yet
 * @param {number} limit - Maximum number of tweets to return
 * @returns {Promise<Array>} Array of unreplied tweets
 */
export async function getUnrepliedEligibleTweets(limit: number = 10): Promise<
  Array<{
    tweetId: string;
    twitterUserId: string;
    username: string;
    text: string;
  }>
> {
  try {
    const tweets = await prisma.tweet.findMany({
      where: {
        isEligible: true,
        botReplied: false,
      },
      orderBy: {
        processedAt: 'asc', // FIFO: oldest first
      },
      take: limit,
      select: {
        tweetId: true,
        twitterUserId: true,
        username: true,
        text: true,
      },
    });

    console.log(`Found ${tweets.length} unreplied eligible tweets`);

    return tweets;
  } catch (error) {
    console.error('Error getting unreplied eligible tweets:', error);
    return [];
  }
}

/**
 * Get reply statistics
 * @returns {Promise<object>} Reply statistics
 */
export async function getReplyStats(): Promise<{
  totalEligible: number;
  replied: number;
  pending: number;
}> {
  try {
    const [totalEligible, replied] = await Promise.all([
      prisma.tweet.count({
        where: { isEligible: true },
      }),
      prisma.tweet.count({
        where: {
          isEligible: true,
          botReplied: true,
        },
      }),
    ]);

    return {
      totalEligible,
      replied,
      pending: totalEligible - replied,
    };
  } catch (error) {
    console.error('Error getting reply stats:', error);
    return {
      totalEligible: 0,
      replied: 0,
      pending: 0,
    };
  }
}
