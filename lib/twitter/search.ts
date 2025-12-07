/**
 * Twitter Search Service
 * Searches for tweets matching specific criteria
 */

import { TweetV2, TwitterApiReadOnly } from 'twitter-api-v2';
import { getBearerClient } from './client';
import prisma from '@/lib/prisma';

export interface SearchCriteria {
  hashtag: string;
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
  hiddenCode?: string; // The hidden code found in the tweet
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
 * Find a valid hidden code in the tweet text
 * Searches for any unused hidden code from the database
 * @param {string} text - Tweet text
 * @returns {Promise<string | null>} The found hidden code or null
 */
async function findHiddenCode(text: string): Promise<string | null> {
  // Get all available (unused) hidden codes from ACTIVE projects only
  const availableCodes = await prisma.validCode.findMany({
    where: {
      isUsed: false,
      project: {
        isActive: true, // Only search codes from active projects
      },
    },
    select: { code: true },
  });

  if (availableCodes.length === 0) {
    return null;
  }

  // Check if any of the codes appear in the tweet text
  const lowerText = text.toLowerCase();

  for (const { code } of availableCodes) {
    const lowerCode = code.toLowerCase();
    if (lowerText.includes(lowerCode)) {
      return code; // Return the original case code
    }
  }

  return null;
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
 * @param {string | null} hiddenCode - Hidden code found in tweet (if any)
 * @returns {ProcessedTweet} Processed tweet with eligibility info
 */
function processTweet(tweet: any, criteria: SearchCriteria, hiddenCode: string | null): ProcessedTweet {
  const hasImage = hasImages(tweet);
  const hasCode = hiddenCode !== null;

  // Tweet is eligible if:
  // 1. Has a valid (unused) hidden code
  // 2. AND has an image (always required for POAP eligibility)
  const isEligible = hasCode && hasImage;

  return {
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    authorUsername: tweet.includes?.users?.[0]?.username || 'unknown',
    hasImage,
    hasCode,
    hiddenCode: hiddenCode || undefined,
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

    if (!response.data || !response.data.data || response.data.data.length === 0) {
      console.log('No tweets found matching criteria');
      return [];
    }

    // Process tweets (need to be async to check hidden codes)
    const processedTweets = await Promise.all(
      response.data.data.map(async (tweet: any) => {
        // Find hidden code in tweet text
        const hiddenCode = await findHiddenCode(tweet.text);

        return processTweet(
          {
            ...tweet,
            includes: response.data.includes,
          },
          criteria,
          hiddenCode
        );
      })
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
 * Search for new tweets since last check
 * Returns all matching tweets (eligible and non-eligible)
 * Searches across all active projects
 * @returns {Promise<ProcessedTweet[]>} Array of new tweets
 */
export async function searchNewEligibleTweets(): Promise<ProcessedTweet[]> {
  try {
    // Get all active projects
    const activeProjects = await prisma.project.findMany({
      where: { isActive: true },
      select: { twitterHashtag: true },
    });

    if (activeProjects.length === 0) {
      throw new Error('No active projects found. Please create and activate a project first.');
    }

    // Get unique hashtags from all active projects
    const hashtags = [...new Set(activeProjects.map(p => p.twitterHashtag))];
    console.log(`Searching tweets for hashtags: ${hashtags.join(', ')}`);

    // Get last processed tweet ID
    const sinceId = await getLastProcessedTweetId();

    // Search tweets for all hashtags
    let allTweets: ProcessedTweet[] = [];

    for (const hashtag of hashtags) {
      const criteria: SearchCriteria = {
        hashtag,
        requireImage: false, // Don't filter by image - we want to reply to all tweets with hashtag
        sinceId,
        maxResults: 100,
      };

      const tweets = await searchTweets(criteria);
      allTweets = allTweets.concat(tweets);
    }

    // Remove duplicates (if a tweet has multiple hashtags)
    const uniqueTweets = Array.from(
      new Map(allTweets.map(tweet => [tweet.id, tweet])).values()
    );

    // Return all tweets (caller will filter eligible ones if needed)
    const eligibleCount = uniqueTweets.filter((tweet) => tweet.isEligible).length;
    const notEligibleCount = uniqueTweets.filter((tweet) => !tweet.isEligible).length;
    console.log(`Found ${uniqueTweets.length} tweets, ${eligibleCount} eligible, ${notEligibleCount} not eligible`);

    return uniqueTweets;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search new eligible tweets: ${error.message}`);
    }
    throw new Error('Failed to search new eligible tweets: Unknown error');
  }
}

/**
 * Save processed tweet to database
 * Associates tweet with project based on hidden code
 * @param {ProcessedTweet} tweet - Processed tweet
 * @returns {Promise<void>}
 */
export async function saveTweet(tweet: ProcessedTweet): Promise<void> {
  try {
    // Determine which project this tweet belongs to
    let projectId: string;

    if (tweet.hiddenCode) {
      // Find project by hidden code
      const validCode = await prisma.validCode.findFirst({
        where: { code: tweet.hiddenCode },
        select: { projectId: true },
      });

      if (validCode) {
        projectId = validCode.projectId;
      } else {
        // Fallback: use first active project
        const project = await prisma.project.findFirst({
          where: { isActive: true },
          select: { id: true },
        });

        if (!project) {
          throw new Error('No active project found');
        }

        projectId = project.id;
      }
    } else {
      // No code found - use first active project for tracking
      const project = await prisma.project.findFirst({
        where: { isActive: true },
        select: { id: true },
      });

      if (!project) {
        throw new Error('No active project found');
      }

      projectId = project.id;
    }

    // Save tweet with project association
    await prisma.tweet.upsert({
      where: { tweetId_projectId: { tweetId: tweet.id, projectId } },
      create: {
        tweetId: tweet.id,
        projectId,
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

    console.log(`Tweet ${tweet.id} saved to database (project: ${projectId})`);
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
