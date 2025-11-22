/**
 * Twitter Search Service
 * Searches for tweets matching specific criteria
 */

import { TweetV2, TwitterApiReadOnly } from 'twitter-api-v2';
import { getBearerClient } from './client';
import prisma from '@/lib/prisma';

export interface SearchCriteria {
  hashtag: string;
  requiredCode: string;
  requireImage: boolean;
  sinceId?: string; // Only get tweets after this ID
  maxResults?: number; // Max tweets to retrieve (default: 100, max: 100)
}

export interface ProcessedTweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  hasImage: boolean;
  hasCode: boolean;
  isEligible: boolean;
  createdAt: Date;
}

/**
 * Build Twitter search query from criteria
 * @param {SearchCriteria} criteria - Search criteria
 * @returns {string} Twitter API search query
 */
function buildSearchQuery(criteria: SearchCriteria): string {
  const parts: string[] = [];

  // Add hashtag (remove # if present)
  const hashtag = criteria.hashtag.replace(/^#/, '');
  parts.push(`#${hashtag}`);

  // Exclude retweets
  parts.push('-is:retweet');

  // Exclude replies (we only want original tweets)
  parts.push('-is:reply');

  // Only tweets with media (images) if required
  if (criteria.requireImage) {
    parts.push('has:media');
  }

  // Language filter (optional)
  // parts.push('lang:es');

  return parts.join(' ');
}

/**
 * Check if tweet text contains the required code
 * @param {string} text - Tweet text
 * @param {string} requiredCode - Code to search for
 * @returns {boolean} True if code is found
 */
function containsRequiredCode(text: string, requiredCode: string): boolean {
  if (!requiredCode) return true;

  // Case-insensitive search
  const lowerText = text.toLowerCase();
  const lowerCode = requiredCode.toLowerCase();

  return lowerText.includes(lowerCode);
}

/**
 * Check if tweet has images
 * @param {any} tweet - Tweet object from API
 * @returns {boolean} True if tweet has images
 */
function hasImages(tweet: any): boolean {
  // Check if tweet has media attachments
  if (!tweet.attachments?.media_keys || tweet.attachments.media_keys.length === 0) {
    return false;
  }

  // Check if includes object has media
  if (!tweet.includes?.media || tweet.includes.media.length === 0) {
    return false;
  }

  // Check if any media is a photo
  return tweet.includes.media.some((media: any) => media.type === 'photo');
}

/**
 * Process tweet to determine eligibility
 * @param {any} tweet - Raw tweet from API
 * @param {SearchCriteria} criteria - Search criteria
 * @returns {ProcessedTweet} Processed tweet with eligibility info
 */
function processTweet(tweet: any, criteria: SearchCriteria): ProcessedTweet {
  const hasImage = hasImages(tweet);
  const hasCode = containsRequiredCode(tweet.text, criteria.requiredCode);

  // Tweet is eligible if:
  // 1. Has the required code (if specified)
  // 2. Has an image (if required)
  const isEligible = hasCode && (!criteria.requireImage || hasImage);

  return {
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    authorUsername: tweet.includes?.users?.[0]?.username || 'unknown',
    hasImage,
    hasCode,
    isEligible,
    createdAt: new Date(tweet.created_at),
  };
}

/**
 * Search for tweets matching criteria
 * @param {SearchCriteria} criteria - Search criteria
 * @returns {Promise<ProcessedTweet[]>} Array of processed tweets
 * @throws {Error} If search fails
 */
export async function searchTweets(
  criteria: SearchCriteria
): Promise<ProcessedTweet[]> {
  try {
    const client = getBearerClient();
    const query = buildSearchQuery(criteria);

    console.log(`Searching tweets with query: "${query}"`);

    const response = await client.v2.search(query, {
      max_results: criteria.maxResults || 100,
      since_id: criteria.sinceId,
      'tweet.fields': ['created_at', 'author_id', 'attachments'],
      'media.fields': ['type', 'url'],
      'user.fields': ['username'],
      expansions: ['author_id', 'attachments.media_keys'],
    });

    if (!response.data || response.data.data.length === 0) {
      console.log('No tweets found matching criteria');
      return [];
    }

    // Process tweets
    const processedTweets = response.data.data.map((tweet: any) =>
      processTweet(
        {
          ...tweet,
          includes: response.data.includes,
        },
        criteria
      )
    );

    console.log(
      `Found ${processedTweets.length} tweets, ${
        processedTweets.filter((t) => t.isEligible).length
      } eligible`
    );

    return processedTweets;
  } catch (error) {
    if (error instanceof Error) {
      // Check for rate limit errors
      if (error.message.includes('429')) {
        throw new Error(
          'Twitter API rate limit exceeded. Please try again later.'
        );
      }
      throw new Error(`Failed to search tweets: ${error.message}`);
    }
    throw new Error('Failed to search tweets: Unknown error');
  }
}

/**
 * Get the last processed tweet ID for resuming searches
 * @returns {Promise<string | undefined>} Last tweet ID or undefined
 */
export async function getLastProcessedTweetId(): Promise<string | undefined> {
  const lastTweet = await prisma.tweet.findFirst({
    orderBy: { processedAt: 'desc' },
    select: { tweetId: true },
  });

  return lastTweet?.tweetId;
}

/**
 * Search for new eligible tweets since last check
 * @returns {Promise<ProcessedTweet[]>} Array of new eligible tweets
 */
export async function searchNewEligibleTweets(): Promise<ProcessedTweet[]> {
  try {
    // Get configuration
    const config = await prisma.config.findFirst();

    if (!config) {
      throw new Error('Configuration not found. Please configure the bot first.');
    }

    // Get last processed tweet ID
    const sinceId = await getLastProcessedTweetId();

    // Build criteria from config
    const criteria: SearchCriteria = {
      hashtag: config.twitterHashtag,
      requiredCode: config.requiredCode,
      requireImage: true, // Always require images for POAP eligibility
      sinceId,
      maxResults: 100,
    };

    // Search tweets
    const tweets = await searchTweets(criteria);

    // Filter only eligible ones
    const eligibleTweets = tweets.filter((tweet) => tweet.isEligible);

    console.log(`Found ${eligibleTweets.length} new eligible tweets`);

    return eligibleTweets;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search new eligible tweets: ${error.message}`);
    }
    throw new Error('Failed to search new eligible tweets: Unknown error');
  }
}

/**
 * Save processed tweet to database
 * @param {ProcessedTweet} tweet - Processed tweet
 * @returns {Promise<void>}
 */
export async function saveTweet(tweet: ProcessedTweet): Promise<void> {
  try {
    await prisma.tweet.upsert({
      where: { tweetId: tweet.id },
      create: {
        tweetId: tweet.id,
        twitterUserId: tweet.authorId,
        username: tweet.authorUsername,
        text: tweet.text,
        hasImage: tweet.hasImage,
        hasCode: tweet.hasCode,
        isEligible: tweet.isEligible,
        processedAt: new Date(),
      },
      update: {
        hasImage: tweet.hasImage,
        hasCode: tweet.hasCode,
        isEligible: tweet.isEligible,
        processedAt: new Date(),
      },
    });

    console.log(`Tweet ${tweet.id} saved to database`);
  } catch (error) {
    console.error(`Failed to save tweet ${tweet.id}:`, error);
    throw error;
  }
}

/**
 * Save multiple tweets to database
 * @param {ProcessedTweet[]} tweets - Array of processed tweets
 * @returns {Promise<number>} Number of tweets saved
 */
export async function saveTweets(tweets: ProcessedTweet[]): Promise<number> {
  let saved = 0;

  for (const tweet of tweets) {
    try {
      await saveTweet(tweet);
      saved++;
    } catch (error) {
      console.error(`Failed to save tweet ${tweet.id}:`, error);
    }
  }

  console.log(`Saved ${saved}/${tweets.length} tweets to database`);
  return saved;
}
