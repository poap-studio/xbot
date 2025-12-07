/**
 * Tests for Twitter reply service
 * @jest-environment node
 */

import {
  replyToTweet,
  markTweetAsReplied,
  generateReplyText,
  replyWithClaimUrl,
  hasBeenRepliedTo,
  getUnrepliedEligibleTweets,
  getReplyStats,
} from '../reply';
import prisma from '@/lib/prisma';

// Mock getBotClient
jest.mock('../client', () => ({
  getBotClient: jest.fn().mockResolvedValue({
    v2: {
      reply: jest.fn().mockResolvedValue({
        data: {
          id: 'reply_tweet_123',
          text: 'Mock reply',
        },
      }),
    },
  }),
}));

const testProjectId = 'test-project-123';

describe('Twitter Reply Service', () => {
  // Clean up before each test
  beforeEach(async () => {
    jest.clearAllMocks();
    // Delete in correct order due to foreign keys
    await prisma.tweet.deleteMany({});
    await prisma.project.deleteMany({});

    // Create a test project for tests that need it
    await prisma.project.create({
      data: {
        id: testProjectId,
        name: 'Test Project',
        poapEventId: '123',
        poapEditCode: 'test-edit-code',
        botReplyEligible: 'Claim your POAP here: {{claimUrl}}',
        botReplyNotEligible: 'Thanks for your interest. Make sure to include a valid code and an image.',
        botReplyAlreadyClaimed: 'You have already claimed a POAP for this event.',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('replyToTweet', () => {
    it('should reply to a tweet successfully', async () => {
      const replyId = await replyToTweet('tweet_123', 'Test reply');

      expect(replyId).toBe('reply_tweet_123');
    });

    it('should throw error if tweet ID is missing', async () => {
      await expect(replyToTweet('', 'Test reply')).rejects.toThrow(
        'Tweet ID is required'
      );
    });

    it('should throw error if reply text is missing', async () => {
      await expect(replyToTweet('tweet_123', '')).rejects.toThrow(
        'Reply text is required'
      );
    });

    it('should throw error if reply text is too long', async () => {
      const longText = 'a'.repeat(281);

      await expect(replyToTweet('tweet_123', longText)).rejects.toThrow(
        'Reply text too long'
      );
    });

    it('should accept reply text with exactly 280 characters', async () => {
      const maxText = 'a'.repeat(280);

      const replyId = await replyToTweet('tweet_123', maxText);

      expect(replyId).toBe('reply_tweet_123');
    });
  });

  describe('markTweetAsReplied', () => {
    beforeEach(async () => {
      await prisma.tweet.create({
        data: {
          tweetId: 'tweet_123',
          projectId: testProjectId,
          twitterUserId: 'user_123',
          username: 'testuser',
          text: 'Test tweet',
          hasImage: true,
          hasCode: true,
          isEligible: true,
          botReplied: false,
        },
      });
    });

    it('should mark tweet as replied', async () => {
      await markTweetAsReplied('tweet_123', 'reply_123');

      const tweet = await prisma.tweet.findFirst({
        where: { tweetId: 'tweet_123', projectId: testProjectId },
      });

      expect(tweet!.botReplied).toBe(true);
      expect(tweet!.botReplyTweetId).toBe('reply_123');
    });
  });

  describe('generateReplyText', () => {
    it('should generate reply text with claim URL', async () => {
      const text = await generateReplyText('https://poap.xyz/claim/abc123');

      expect(text).toBe('Claim your POAP here: https://poap.xyz/claim/abc123');
    });

    it('should truncate text if too long', async () => {
      // Update project with long template
      // 260 'a' + ' ' + 'https://poap.xyz/claim/abc123' (32 chars) = 293 chars
      await prisma.project.update({
        where: { id: testProjectId },
        data: {
          botReplyEligible: 'a'.repeat(260) + ' {{claimUrl}}',
        },
      });

      const text = await generateReplyText('https://poap.xyz/claim/abc123');

      expect(text.length).toBe(280);
      expect(text).toContain('...');
    });

    it('should throw error if project not found', async () => {
      // Delete all projects
      await prisma.project.deleteMany({});

      await expect(
        generateReplyText('https://poap.xyz/claim/abc123')
      ).rejects.toThrow('No active project found');
    });
  });

  describe('replyWithClaimUrl', () => {
    it('should reply with claim URL and mark as replied', async () => {
      await prisma.tweet.create({
        data: {
          tweetId: 'tweet_123',
          projectId: testProjectId,
          twitterUserId: 'user_123',
          username: 'testuser',
          text: 'Test tweet',
          hasImage: true,
          hasCode: true,
          isEligible: true,
        },
      });

      const replyId = await replyWithClaimUrl(
        'tweet_123',
        'https://poap.xyz/claim/abc123'
      );

      expect(replyId).toBe('reply_tweet_123');

      const tweet = await prisma.tweet.findFirst({
        where: { tweetId: 'tweet_123', projectId: testProjectId },
      });

      expect(tweet!.botReplied).toBe(true);
      expect(tweet!.botReplyTweetId).toBe('reply_tweet_123');
    });
  });

  describe('hasBeenRepliedTo', () => {
    it('should return false if tweet not found', async () => {
      const result = await hasBeenRepliedTo('non_existent_tweet');

      expect(result).toBe(false);
    });

    it('should return false if tweet not replied', async () => {
      await prisma.tweet.create({
        data: {
          tweetId: 'tweet_123',
          projectId: testProjectId,
          twitterUserId: 'user_123',
          username: 'testuser',
          text: 'Test tweet',
          hasImage: true,
          hasCode: true,
          isEligible: true,
          botReplied: false,
        },
      });

      const result = await hasBeenRepliedTo('tweet_123');

      expect(result).toBe(false);
    });

    it('should return true if tweet has been replied to', async () => {
      await prisma.tweet.create({
        data: {
          tweetId: 'tweet_123',
          projectId: testProjectId,
          twitterUserId: 'user_123',
          username: 'testuser',
          text: 'Test tweet',
          hasImage: true,
          hasCode: true,
          isEligible: true,
          botReplied: true,
          botReplyTweetId: 'reply_123',
        },
      });

      const result = await hasBeenRepliedTo('tweet_123');

      expect(result).toBe(true);
    });
  });

  describe('getUnrepliedEligibleTweets', () => {
    beforeEach(async () => {
      await prisma.tweet.createMany({
        data: [
          {
            tweetId: 'tweet_1',
            projectId: testProjectId,
            twitterUserId: 'user_1',
            username: 'user1',
            text: 'Test tweet 1',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: false,
            processedAt: new Date('2024-01-01'),
          },
          {
            tweetId: 'tweet_2',
            projectId: testProjectId,
            twitterUserId: 'user_2',
            username: 'user2',
            text: 'Test tweet 2',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: true, // Already replied
            processedAt: new Date('2024-01-02'),
          },
          {
            tweetId: 'tweet_3',
            projectId: testProjectId,
            twitterUserId: 'user_3',
            username: 'user3',
            text: 'Test tweet 3',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: false,
            processedAt: new Date('2024-01-03'),
          },
          {
            tweetId: 'tweet_4',
            projectId: testProjectId,
            twitterUserId: 'user_4',
            username: 'user4',
            text: 'Test tweet 4',
            hasImage: false,
            hasCode: false,
            isEligible: false, // Not eligible
            botReplied: false,
            processedAt: new Date('2024-01-04'),
          },
        ],
      });
    });

    it('should return unreplied eligible tweets', async () => {
      const tweets = await getUnrepliedEligibleTweets();

      expect(tweets).toHaveLength(2);
      expect(tweets[0].tweetId).toBe('tweet_1');
      expect(tweets[1].tweetId).toBe('tweet_3');
    });

    it('should respect limit parameter', async () => {
      const tweets = await getUnrepliedEligibleTweets(1);

      expect(tweets).toHaveLength(1);
      expect(tweets[0].tweetId).toBe('tweet_1'); // Oldest first (FIFO)
    });

    it('should return tweets in FIFO order', async () => {
      const tweets = await getUnrepliedEligibleTweets(10);

      expect(tweets[0].tweetId).toBe('tweet_1'); // Oldest
      expect(tweets[1].tweetId).toBe('tweet_3'); // Newer
    });
  });

  describe('getReplyStats', () => {
    beforeEach(async () => {
      await prisma.tweet.createMany({
        data: [
          {
            tweetId: 'tweet_1',
            projectId: testProjectId,
            twitterUserId: 'user_1',
            username: 'user1',
            text: 'Test 1',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: true,
          },
          {
            tweetId: 'tweet_2',
            projectId: testProjectId,
            twitterUserId: 'user_2',
            username: 'user2',
            text: 'Test 2',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: true,
          },
          {
            tweetId: 'tweet_3',
            projectId: testProjectId,
            twitterUserId: 'user_3',
            username: 'user3',
            text: 'Test 3',
            hasImage: true,
            hasCode: true,
            isEligible: true,
            botReplied: false,
          },
          {
            tweetId: 'tweet_4',
            projectId: testProjectId,
            twitterUserId: 'user_4',
            username: 'user4',
            text: 'Test 4',
            hasImage: false,
            hasCode: false,
            isEligible: false,
            botReplied: false,
          },
        ],
      });
    });

    it('should return correct reply statistics', async () => {
      const stats = await getReplyStats();

      expect(stats).toEqual({
        totalEligible: 3,
        replied: 2,
        pending: 1,
      });
    });

    it('should return zero stats if no tweets', async () => {
      await prisma.tweet.deleteMany({});

      const stats = await getReplyStats();

      expect(stats).toEqual({
        totalEligible: 0,
        replied: 0,
        pending: 0,
      });
    });
  });
});
